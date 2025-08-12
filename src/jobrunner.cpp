#include <iostream>
#include <fstream>
#include <filesystem>
#include <thread>
#include <vector>
#include <queue>
#include <mutex>
#include <set>
#include <condition_variable>
#include <chrono>
#include "json.hpp"
using namespace std;
using json = nlohmann::json;
namespace fs = std::filesystem;

struct Job 
{
    string inputPath;
    string outputPath;
};

mutex jobMutex;
condition_variable jobAvailable;
queue<Job> jobQueue;
bool stop = false;
set<std::string> seen;
string exePath;
bool readJsonFile(const std::string& path, json& outJson) 
{
    for (int i = 0; i < 5; ++i) 
    {
        try 
        {
            ifstream f(path);
            if (f.is_open() && f.peek() != std::ifstream::traits_type::eof()) {
                f >> outJson;
                return true;
            }
        } catch (...) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    return false;
}

void processJob() 
{
    while (true) {
        Job job;
        {
            std::unique_lock<std::mutex> lock(jobMutex);
            // cout<<"YES\n";
            jobAvailable.wait(lock, [] { return !jobQueue.empty() || stop; });
            if (stop && jobQueue.empty()) return;
            job = jobQueue.front();
            jobQueue.pop();
        }
 
        // Read input from job.inputPath
        std::ifstream inputFile(job.inputPath);
        if (!inputFile.is_open()) cout<<"Problem";

        
        json inputJson;
        if (!readJsonFile(job.inputPath, inputJson)) continue;

        std::string input = inputJson["input"];

        std::string tempInput = "tmp_input_" + std::to_string(std::hash<std::string>{}(job.inputPath)) + ".txt";
        {
            std::ofstream fout(tempInput);
            fout << input;
        }

        // Run the executable
        std::string command = exePath + " < " + tempInput;
        FILE* pipe = popen(command.c_str(), "r");
        if (!pipe) continue;

        std::string result;
        char buffer[256];
        while (fgets(buffer, sizeof(buffer), pipe)) {
            result += buffer;
        }
        pclose(pipe);
        std::remove(tempInput.c_str());

        // Write output
        json outputJson;
        outputJson["output"] = result;
        cout<<result<<endl;
        std::ofstream outFile(job.outputPath);
        outFile << outputJson.dump(2);
        outFile.close();
    }
}

void watchForJobs(const std::string& watchDir) {
    std::set<std::string> seen;

    while (!stop) {
        for (const auto& entry : fs::directory_iterator(watchDir)) {
            if (entry.path().extension() == ".json") {
                std::string filePath = entry.path().string();

                // if (seen.count(filePath)) continue;
                
                // Read job file
                std::ifstream jf(filePath);
                if (!jf.is_open()) continue;

                json jobJson;
                jf >> jobJson;
                jf.close();

                std::string input = jobJson["inputPath"];
                std::string output = jobJson["outputPath"];

                {
                    std::lock_guard<std::mutex> lock(jobMutex);
                    jobQueue.push({input, output});
                }
                jobAvailable.notify_one();

                // seen.insert(filePath);
                fs::remove(filePath); // remove after processing
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(100)); // polling interval
    }
}

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: ./job_runner <compiled_executable_path> <job_folder_path>\n";
        return 1;
    }

    exePath = argv[1];
    std::string jobFolder = argv[2];

    int threadCount = std::thread::hardware_concurrency();
    std::vector<std::thread> workers;
    std::thread watcher(watchForJobs, jobFolder);
    for (int i = 0; i < threadCount; ++i) {
        workers.emplace_back(processJob);
    }
    std::cin.get();
    stop = true;
    jobAvailable.notify_all();
    watcher.join();
    for (auto& t : workers) t.join();
    return 0;
}

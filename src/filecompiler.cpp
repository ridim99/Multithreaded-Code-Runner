#include<iostream>
#include<string>
using namespace std;

int main(int argc,char* argv[])
{
    string sourcefile = argv[1];
    string compilecommand = "g++ "+ sourcefile + " -o" + sourcefile;
    while(compilecommand.back() != '.')
    {
        compilecommand.pop_back();
    }
    compilecommand = compilecommand + "exe";
    int result = system(compilecommand.c_str());
}

// this program just compiles your current running file
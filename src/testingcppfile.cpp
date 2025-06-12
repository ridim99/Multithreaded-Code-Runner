#include <iostream>
#include <windows.h>  // for Sleep()
using namespace std;

int main() 
{
    int n;
    cin>>n;
    Sleep(n);
    cout<<"sleeped for "<<n<<" miliseconds\n";
    return 0;
}

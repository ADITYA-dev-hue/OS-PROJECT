#include<iostream>
using namespace std;
void fun(int arr[],int n){
    if(n==-1){
        return;
    }
    cout<<arr[n]<<" ";
    fun(arr,n-1);
    
}
int main(){
    int n;
    cin>>n;
    int arr[n];
    for(int i=0;i<n;i++){
        cin>>arr[i];
    }

    fun(arr,n-1);
}
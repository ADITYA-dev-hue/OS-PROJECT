#include<iostream>
using namespace std;

int main(){
    int n;
    cin>>n;

    int arr[10];
    for(int i=0;i<n;i++){
        cin>>arr[i];
    }
    
    int j=0;
    
    for(int i=1;i<n;i++){
        if(arr[j]!=arr[i]){
            j++;
            arr[j]=arr[i];
        }
    }
    for(int i=0;i<j+1;i++){
        cout<<arr[i]<<" ";
    }
    
    cout<<endl;

    int arr2[]={1,1,2,2,3,4,4,5,5,5,6};
    int l=sizeof(arr2)/sizeof(arr2[0]);
    for(int i=0;i<l;i++){
        if(arr2[i]!=arr2[i+1]){
            cout<<arr2[i]<<" ";

        }
    }
    cout<<endl;
    return 0;
}
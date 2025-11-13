#include<iostream>
using namespace std;
void BubbleSort(int arr[],int n){
    for(int i=0;i<n-1;i++){
        for(int j=0;j<n-1-i;j++){
            if(arr[j]>arr[j+1]){
                int temp=arr[j];
                arr[j]=arr[j+1];
                arr[j+1]=temp;
            }
        }
    }
}
void selection_Sort(int arr[],int n){
    for(int i=0;i<n-1;i++){
        int min_idx=i;
        for(int j=i+1;j<n;j++){
            if(arr[j]<arr[min_idx]){
                min_idx=j;
            }
        }
        swap(arr[i],arr[min_idx]);
    }
}
void Insertion_sort(int arr[],int n){
    for(int i=1;i<n;i++){
        int key=arr[i];
        int j=i-1;
        while(j>=0 and arr[j]>key){
            arr[j+1]=arr[j];
            j--;
        }
        arr[j+1]=key;
    }
}
int main(){
    int n;
    cin>>n;
    int arr_bubb[n];
    for(int i=0;i<n;i++){
        cin>>arr_bubb[i];
    }
    for(int i=0;i<n;i++){
        cout<<arr_bubb[i]<<" ";
    }
    cout<<endl;
    Insertion_sort(arr_bubb,n);
    for(int i=0;i<n;i++){
        cout<<arr_bubb[i]<<" ";
    }
}

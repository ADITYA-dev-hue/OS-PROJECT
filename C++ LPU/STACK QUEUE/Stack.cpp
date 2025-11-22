#include<iostream>
using namespace std;


class Stack{
    int arr[100];
    int top_index= -1;
    public:
    void push(int val){
        if(top_index>100){
            cout<<"Stack OverLoad..\n";
            return;
        }
        top_index++;
        arr[top_index]=val;
    }
    void pop(){
        if(top_index==-1){
            cout<<"Stack is empty\n";
            return;
        }
        top_index--;
    }
    int top(){
        return arr[top_index];
    }
    void display(){
        for(int i=0;i<=top_index;i++){
            cout<<arr[i]<<" ";
        }
        int a=top();
        cout<<"\nTop Value = "<<a<<endl<<endl;
    }

};
int main(){
    Stack st;
    int a;
    cout<<"Enter 5 elements to push in stack: ";
    for(int i=0;i<5;i++){
        cin>>a;
        st.push(a);
    }
    int n;
    do{
        cout<<"Enter choice : 1. Push  2.pop  3.display 4.Exit\n";
        cin>>n;
        if(n==1){
            cout<<"Enter element to push : ";
            cin>>a;
            st.push(a);
            cout<<"Element "<<a<<" is pushed \n";
        }else if(n==2){
            st.pop();
            cout<<"Top element is poped...\n";
        }else if(n==3){
            st.display();
        }else if(n==4){
            cout<<"Exiting..!!";
            break;
        }else{
            cout<<"Choise is wrong...!!\n";
        }
    }while(n!=4);
    return 0;
    
}
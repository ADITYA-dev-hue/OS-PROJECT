#include<iostream>
#include<vector>
using namespace std;
class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        int start = 0;
        int end = numbers.size()-1;
        vector<int> i;
        while(start<=end){
            if(numbers[start]+numbers[end]==target){
                    i.push_back(start+1);
                    i.push_back(end+1);
                    return i;
            }
            else if(numbers[start]+numbers[end]<target){
                start=start+1;
            }
            else if(numbers[start]+numbers[end]>target){
                end=end-1;
            }
        }
        return i;
    }
};
int main(){
    int target;
    vector<int> v;
    cout<<"Enter sorted numbers in ascending order in Vector: ";
    for(int i=0;i<6;i++){
        int x;
        cin>>x;
        v.push_back(x);
    }
    cout<<"Enter target sum: ";
    cin>>target;

    Solution obj;
    vector<int> result = obj.twoSum(v,target);

    cout<<"Indices of the two numbers such that they add up to target are: ";
    for(int i=0;i<result.size();i++){
        cout<<result[i]<<" ";
    }
    cout<<endl;
    return 0;
}
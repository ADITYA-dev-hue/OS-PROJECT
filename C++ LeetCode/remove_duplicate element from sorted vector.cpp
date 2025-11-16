#include<iostream>
using namespace std;
#include<vector>
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        int n=nums.size();
        if(n==0){
            return 0;
        }
        int j=0;
        for(int i=1;i<n;i++){
            if(nums[i]!=nums[j]){
                j++;
                nums[j]=nums[i];
            }
        }
        return j+1;
    }
};
int main(){
    vector<int> v={1,1,2,2,3,4,4,5,5,5,6};
    cout<<"Original vector: ";
    for(int i=0; i<v.size() ;i++){
        cout<<v[i]<<" ";
    }
    cout<<endl;
    Solution obj;
    int k=obj.removeDuplicates(v);
    cout<<"Vector after removing duplicates: ";
    for(int i=0;i<k;i++){
        cout<<v[i]<<" ";
    }
    cout<<endl;
    cout<<"New length of the vector is: "<<k<<endl;
    return 0;
}
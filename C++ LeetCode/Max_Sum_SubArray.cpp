#include<iostream>
using namespace std;
#include<vector>
class Solution {
    vector<int> subarray(vector<int>& v,int start,int end){
        vector<int> sub;
        for(int i=start;i<=end;i++){
                sub.push_back(v[i]);            
        }
        return sub;
    }
    int Sum(vector<int> v){
        int n=v.size();
        int sum=0;
        for(int i=0;i<=n-1;i++){
            sum+=v[i];
        }
        return sum;
    }
public:
    int maxSubArray(vector<int>& nums) {
        vector<int> v;
        int a=Sum(nums);
        int end=nums.size();
        if(end==1){
            return a;
        }
        for(int i=0;i<=end-1;i++){
            for(int j=0;j<=end-1;j++){
                if(i<=j){
                    v=subarray(nums,i,j);
                }
                int c=Sum(v);
                if(c>=a){
                    a=c;
                }
                
            }
        }
        return a;    
    }
};
int main(){
    vector<int> v={-1,4,-6,2,-7,3,4,-1,2,1,-5,4};
    for(int i=0;i<v.size();i++){
        cout<<v[i]<<" ";
    }
    cout<<endl;
    Solution obj;
    int result=obj.maxSubArray(v);
    cout<<"Maximum Subarray Sum is: "<<result<<endl;
    return 0;
}
#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;
class Solution{
    public:
    int arrayPairSum(vector<int>& nums) {
        sort(nums.begin(),nums.end());
        int sum=0;
        int min_pair=0;

        for(int i=0; i<nums.size();i+=2){
            min_pair = min(nums[i+1], nums[i]);
            sum+=min_pair;
        }
        cout<<"Maximum Sum of min pairs is: "<<sum<<endl;
        return sum;
    }

};

int main(){
    int n;
    cout<<"Enter size of array: ";
    cin>>n;
    vector<int> arr;
    cout<<"Enter elements of array: ";
    for(int i=0;i<n;i++){
        int x;
        cin>>x;
        arr.push_back(x);
    }
    Solution obj;
    obj.arrayPairSum(arr);
    return 0;

}

#include<iostream>
using namespace std;
class Node{
    public:
    int data;
    Node* next;
    
};
Node* createNode(int val){
    Node* newNode=new Node;
    newNode->data=val;
    newNode->next=NULL;
    return newNode;
}
void insertAtEnd(Node** head,int val){
    Node* newNode=new Node;
    newNode=createNode(val);
    if(*head==NULL){
        *head=newNode;
        return;
    }
    Node* current = *head;
    while(current->next!=NULL){
        current=current->next;
    }
    current->next=newNode;
}

Node* merge1(Node* head1,Node* head2){
    Node* temp1=head1;
    Node* temp2=head2;
    Node* dumyHead=new Node;
    dumyHead=createNode(-1);
    Node* temp3=dumyHead;
    while(temp1!=NULL and temp2!=NULL){
        if(temp1->data < temp2->data){
            temp3->next=temp1;
            temp1=temp1->next;
            temp3=temp3->next;
        }
        else if(temp1->data > temp2->data){
            temp3->next=temp2;
            temp2=temp2->next;
            temp3=temp3->next;
        }
        
    }
    if(temp1!=NULL){
        while(temp1){
            temp3->next=temp1;
            temp1=temp1->next;
            temp3=temp3->next;
        }
    }
    if(temp2!=NULL){
        temp3->next=temp2;
        temp2=temp2->next;
        temp3=temp3->next;
    }


    return dumyHead->next;
}

void display(Node* head){
    Node* temp=head;
    while(temp!=NULL){
        cout<<temp->data<<" ";
        temp=temp->next;
    }
}

void merge(Node* head1,Node* head2){
    Node* temp1=head1;
    Node* temp2=head2; 
    while(temp1 and temp2){
        if(temp1->data > temp2->data){
            cout<<temp2->data<<" ";
            temp2=temp2->next;
        }
        else{
            cout<<temp1->data<<" ";
            temp1=temp1->next;
        }
    }
    if(temp1!=NULL){
        while(temp1){
            cout<<temp1->data<<" ";
            temp1=temp1->next;
        }
    }
    if(temp2!=NULL){
        while(temp2){
            cout<<temp2->data<<" ";
            temp2=temp2->next;
        }
    }
}
int main(){
    //Merge two sorted linked list using dummy node in O(1) space complexity
    //Merg1() function is used for that.
    Node* head1=NULL;
    Node* head2=NULL;
    insertAtEnd(&head1,1);
    insertAtEnd(&head1,3);
    insertAtEnd(&head1,5);
    insertAtEnd(&head1,7);
    insertAtEnd(&head1,9);
    insertAtEnd(&head1,11);

    insertAtEnd(&head2,2);
    insertAtEnd(&head2,4);
    insertAtEnd(&head2,6);
    insertAtEnd(&head2,8);

    cout<<"Merge1() function\nFirst Linked List: ";
    display(head1);
    cout<<endl;
    cout<<"Second Linked List: ";
    display(head2);
    cout<<endl;
    cout<<"Merged Linked List: ";
    Node* mergedHead=merge1(head1,head2);
    display(mergedHead);

    //merge(head1,head2); //This function is used to merge two sorted linked list in O(1) space complexity.
    //Without using dummy node.
    Node* head3=NULL;
    Node* head4=NULL;
    insertAtEnd(&head3,10);
    insertAtEnd(&head3,20);
    insertAtEnd(&head3,30);
    insertAtEnd(&head3,40);


    insertAtEnd(&head4,15);
    insertAtEnd(&head4,25);     
    insertAtEnd(&head4,35);
    insertAtEnd(&head4,45);
    insertAtEnd(&head4,55);
    insertAtEnd(&head4,65);
    insertAtEnd(&head4,75);
    cout<<endl<<endl;
    cout<<"Merge() function\nFirst Linked List: ";
    display(head3);
    cout<<endl;
    cout<<"Second Linked List: ";
    display(head4);
    cout<<endl;
    cout<<"Merged Linked List: ";
    merge(head3,head4);
    return 0;
}
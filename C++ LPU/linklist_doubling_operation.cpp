#include<iostream>
using namespace std;
class Node{
    public:
    int data;
    Node* next;
    Node* previous;
    Node(int val){
        this->data=val;
        this->next=NULL;
        this->previous=NULL;
    }
    void insert(int data,Node *head){
        Node *new_node=new Node(data);
        new_node->next=head;
        head->previous=new_node;
    }
    void position_insert(int data,int position,Node *head){
        Node* new_node=new Node(data);
        position--;
        while(position--){
            head=head->next;
        }
        new_node->next=head->next;
        new_node->previous=head;
        if(head->next!=NULL){
            head->next->previous=new_node;
        }
        head->next=new_node;

    }
    void position_delete(int position,Node *head){   
        position--;
        while(position--){
            head=head->next;
        }

        if(head->next->next!=NULL){
            head->next = head->next->next;
            head->next->previous=head;
        }
        else{
            head->next=NULL;
        }

    }
};
    void deleteHead(Node** head){
        if((*head)==NULL){
            return;
        }
        *head=(*head)->next;
        (*head)->previous=NULL;
    }
    void display(Node* head){
        Node* temp=head;
        while(temp!=NULL){
            cout<<temp->data<<" ";
            temp=temp->next;
        }
    }

int main(){
    Node* n1=new Node(10);
    Node* n2=new Node(20);
    Node* n3=new Node(30);
    // Linking next pointers
    n1->next=n2;
    n2->next=n3;
    n3->next=NULL;

    //Linking previous pointers;
    n3->previous=n2;
    n2->previous=n1;
    n1->previous=NULL;

    Node *head=n1;
    Node *tail=n3;

    // Inserting a node at position 2
    head->position_insert(15,1,head);
    head->position_insert(200,2,head);

    // Print from head to tail....
    Node* temp=head;
    while(temp!=NULL){
        cout<<temp->data<<" ";
        temp=temp->next;
    }
    cout<<endl;
    head->insert(6,head);
    // Deleting a node at position 3
    head->position_delete(1,head);

    // Print from head to tail after deletion....
    temp=head;
    while(temp!=NULL){
        cout<<temp->data<<" ";
        temp=temp->next;
    }
    cout<<endl<<"Linked list after deleting head node: \n";
    
    deleteHead(&head);
    display(head);
    cout<<endl;
    // print from tail to head after deleton....
    while(tail!=NULL){
        cout<<tail->data<<" ";
        tail=tail->previous;
    }
    return 0;
}
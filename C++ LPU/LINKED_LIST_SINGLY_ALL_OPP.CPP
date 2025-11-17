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
int length(Node* head){
    int count=0;
    Node* temp=head;
    while(temp){
        temp=temp->next;
        count++;
    }
    return count;
}
void insertAtEnd(Node** head,int val){
    Node* newNode=new Node;
    newNode=createNode(val);
    if((*head)==NULL){
        *head=newNode;
        return;
    }
    Node* curr=*head;
    while(curr->next){
        curr=curr->next;
    }
    curr->next=newNode;
}
void display(Node* head){
    Node* temp=head;
    while(temp){
        cout<<temp->data<<" ";
        temp=temp->next;
    }
    cout<<endl;
}
void insertAtStart(Node** head , int val){
    Node* newNode=new Node;
    newNode=createNode(val);
    if((*head)==NULL){
        *head=newNode;
        return;
    }
    newNode->next= *head;
    *head=newNode;
}
void insertAtKposition(Node** head , int k,int val){
    Node* newNode=new Node;
    newNode=createNode(val);
    
   
    int l=length(*head);
    if(k==1){
    //    insertAtStart(&head,val);
        newNode->next=*head;
        *head=newNode;
        return;
    }
    Node* temp=*head;
    if(k>l){
        cout<<"Invalid position..\n";
        return;
    }
    if(k>1){
    k--;
    while(k!=1){
        temp=temp->next;
        k--;
    }  
    newNode->next=temp->next;
    temp->next=newNode;
    }
}
void insertAfterValue(Node** head,int val,int no){
    Node* newNode=new Node;
    newNode=createNode(no);
    Node* temp= *head;
    if((*head)==NULL){
        cout<<"Value not found\n";
        return;
    }
    
    while(temp!=NULL and temp->data!=val){
        temp=temp->next;
    }
    if(temp==NULL){
        cout<<"Value not found\n";
        return;
    }
    newNode->next=temp->next;
    temp->next=newNode;

}
void insertBeforeValue(Node** head,int val,int n){
    Node* newNode=new Node;
    newNode=createNode(n);
    Node* temp= *head;
    if((*head)==NULL){
        cout<<"Value not exists..\n";
        return;
    }

    while(temp->next!=NULL and temp!=NULL and temp->next->data!=val){
        temp=temp->next;
    }

    if(temp==NULL || temp->next==NULL){
        cout<<"Value Not Exists\n";
        return;
    }

    newNode->next=temp->next;
    temp->next=newNode;

}
void deleteFromend(Node** head){
    Node* temp= *head;
    if(*head==NULL){
        cout<<"List is Empty\n";
        return;
    }
    if((*head)->next==NULL){
        cout<<"List is empty\n";
        *head=NULL;
        return;
    }
    while(temp->next->next!=NULL){
        temp=temp->next;
    }
    temp->next=NULL;
}
void deleteAtStart(Node** head){
    if(*head==NULL){
        cout<<"List is empty..\n";
        return;
    }
    *head=(*head)->next;
}
void deleteAtPosition(Node** head,int pos){
    Node* temp= *head;
    int l=length(temp);
    if(pos>l){
        cout<<"Invalid Position..\n";
        return;
    }
    if((*head)->next==NULL and pos==1){
        deleteFromend(&(*head));
        return;
    }
    if(*head==NULL){
        cout<<"List is empty..\n";
        return;
    }
    pos--;
    while(pos!=1 && temp->next!=NULL){
        temp=temp->next;
        pos--;
    }
    
    temp->next=temp->next->next;

}
Node* reverse(Node* head){
    Node* curr=head;
    Node* next=NULL;
    Node* prev=NULL;
    while(curr){
        next=curr->next;
        curr->next=prev;
        prev=curr;
        curr=next;
    }
    return prev;
}

int main(){
    int n;
    int val;
    Node* head=NULL;
    do{
        cout<<"0. Exit\n1. Insert at end   2.Display  3.InsertAtStart  4.InsertAtKposition  5. InsertAfterValue\n6.InsertBeforeValue  ";
        cout<<"7. deleteFromEnd  8.deleteFromStart  9.Delete from pos.  \n10.Reverse the list\n";
        cin>>n;
        if(n==1){
            cout<<"enter value: ";
            cin>>val;
            insertAtEnd(&head,val);
        }
        if(n==2){
            display(head);
        }
        if(n==3){
            cout<<"Enter value: ";
            cin>>val;
            insertAtStart(&head,val);
        }
        if(n==4){
            cout<<"Enter Position:";
            int k;
            cin>>k;
            cout<<"Enter Value : ";
            cin>>val;
            insertAtKposition(&head,k,val);
        }
        if(n==5){
            cout<<"Enter val";
            cin>>val;
            int x;
            cout<<"Enter no.";
            cin>>x;
            insertAfterValue(&head,val,x);
        }
        if(n==6){
            cout<<"Enter val";
            cin>>val;
            int x;
            cout<<"Enter no.";
            cin>>x;
            insertBeforeValue(&head,val,x);
        }
        if(n==7){
            deleteFromend(&head);
        }
        if(n==8){
            deleteAtStart(&head);
        }
        if(n==9){
            cout<<"Enter position: ";
            cin>>val;
            deleteAtPosition(&head,val);
        }
        if(n==10){
            head=reverse(head);
        }
    }while(n!=0);
}
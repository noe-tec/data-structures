/*
 * Splay tree of ints, bottom-up, with parent links. Values do not repeat.
 * Complete the methods marked with TODO in this order: rotateRight, rotateLeft and splay (private),
 * then contains, insert and remove (public). Each one uses the ones before it.
 * replaceInParent and lastOnPath are already written. Do not change the rest of the class.
 *
 * Student ID:
 * Date:
 */

#ifndef SPLAY_H
#define SPLAY_H

#include <iostream>
using namespace std;

struct Node {
	int info;
	Node *left;
	Node *right;
	Node *parent;
};

class SplayTree {
public:
	SplayTree() = default;
	~SplayTree() { destroy(root); }

	// Copying is disabled so that two trees never own the same nodes.
	SplayTree(const SplayTree &) = delete;
	SplayTree &operator=(const SplayTree &) = delete;

	// Searches for x and splays the node where the search ends: x if it is in the tree, otherwise the
	// last node of its search path (lastOnPath gives it). Returns whether x is in the tree.
	// An empty tree returns false.
	bool contains(int x) {
		// TODO
		return false;
	}

	// Inserts x as in a BST, as a new leaf, and splays the new node. Returns true.
	// lastOnPath(x) gives the node that holds x, or the node where x must hang. A repeated value adds
	// no node: it splays the node that already holds x and returns false. Set the parent of the new node.
	bool insert(int x) {
		// TODO
		return false;
	}

	// Removes x. First contains(x): if x is not there, returns false (the tree was still splayed).
	// Otherwise x is the root: delete it, and TL and TR, its two subtrees, become separate trees.
	// With no TL, TR is the whole tree. Otherwise make TL the tree, splay its maximum (lastOnPath(x)
	// finds it, because x is greater than every key of TL), and hang TR as the right child of the new
	// root. Keep every parent link correct. Returns true.
	bool remove(int x) {
		// TODO
		return false;
	}

	// The public methods that print also end the line.
	void preorder() const {
		preorder(root);
		cout << "\n";
	}

	void inorder() const {
		inorder(root);
		cout << "\n";
	}

private:
	Node *root = nullptr;

	// The tests call the private methods one by one.
	friend struct SplayTester;

	// b takes the place of a: under the parent of a, or as the root. Already written.
	void replaceInParent(Node *a, Node *b) {
		b->parent = a->parent;
		if (a->parent == nullptr) root = b;
		else if (a == a->parent->left) a->parent->left = b;
		else a->parent->right = b;
	}

	// Rotates right at a: b, the left child of a, rises and a goes down to its right. The right subtree
	// of b becomes the left subtree of a. Keep every parent link correct; replaceInParent puts b where
	// a was (it also updates root when a was the root).
	void rotateRight(Node *a) {
		// TODO
	}

	// The mirror image: the right child of a rises and a goes down to its left.
	void rotateLeft(Node *a) {
		// TODO
	}

	// Moves x to the root. While x has a parent P, look at its grandparent G and apply the case:
	//   no G:                          zig (rotate right at P) or zag (rotate left at P)
	//   P is the left child of G:      zig-zig (right at G, then right at P) or zig-zag (left at P, then right at G)
	//   P is the right child of G:     zag-zag (left at G, then left at P) or zag-zig (right at P, then left at G)
	void splay(Node *x) {
		// TODO
	}

	// Returns the node with x, or the last node of the search path of x. root is not null. Already written.
	Node *lastOnPath(int x) const {
		Node *n = root;
		while (x != n->info) {
			Node *next = (x < n->info) ? n->left : n->right;
			if (next == nullptr) break;
			n = next;
		}
		return n;
	}

	// The methods below are already written.

	void preorder(Node *n) const {
		if (n == nullptr) return;
		cout << n->info << " ";
		preorder(n->left);
		preorder(n->right);
	}

	void inorder(Node *n) const {
		if (n == nullptr) return;
		inorder(n->left);
		cout << n->info << " ";
		inorder(n->right);
	}

	void destroy(Node *n) {
		if (n == nullptr) return;
		destroy(n->left);
		destroy(n->right);
		delete n;
	}
};

#endif

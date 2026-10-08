/*
 * Binary search tree of ints. Values do not repeat.
 * Complete the private methods marked with TODO. Do not change the rest of the class.
 * Start with insert and preorder: the tests use them to build and show the trees.
 *
 * Student ID:
 * Date:
 */

#ifndef BST_H
#define BST_H

#include <algorithm>
#include <iostream>
#include <queue>
using namespace std;

struct Node {
	int info;
	Node *left;
	Node *right;
};

class BST {
public:
	BST() = default;
	~BST() { destroy(root); }

	// Copying is disabled so that two trees never own the same nodes.
	BST(const BST &) = delete;
	BST &operator=(const BST &) = delete;

	// Each public method calls the private method with the same name, starting at root.
	bool insert(int x) { return insert(root, x); }
	Node *search(int x) const { return search(root, x); }
	int height() const { return height(root); }
	int depth(int x) const { return depth(root, x); }
	bool remove(int x) { return remove(root, x); }

	// The public methods that print also end the line.
	void preorder() const {
		preorder(root);
		cout << "\n";
	}

	void inorder() const {
		inorder(root);
		cout << "\n";
	}

	void postorder() const {
		postorder(root);
		cout << "\n";
	}

	void levelOrder() const {
		levelOrder(root);
		cout << "\n";
	}

private:
	Node *root = nullptr;

	// Adds x where a search for it ends. Returns false if x was already in the tree.
	bool insert(Node *&n, int x) {
		// TODO
		return false;
	}

	// Prints the node, then its left subtree, then its right subtree. Each value is followed by one space.
	void preorder(Node *n) const {
		// TODO
	}

	// Prints the left subtree, then the node, then the right subtree.
	void inorder(Node *n) const {
		// TODO
	}

	// Prints the left subtree, then the right subtree, then the node.
	void postorder(Node *n) const {
		// TODO
	}

	// Returns the node that holds x, or nullptr if x is not in the tree.
	Node *search(Node *n, int x) const {
		// TODO
		return nullptr;
	}

	// Returns the number of edges on the longest path down to a leaf. An empty tree has height -1.
	int height(Node *n) const {
		// TODO
		return 0;
	}

	// Returns the number of edges from the root to the node that holds x, or -1 if x is not in the tree.
	int depth(Node *n, int x) const {
		// TODO
		return 0;
	}

	// Prints the values level by level, from left to right. Use a queue<Node *>.
	void levelOrder(Node *n) const {
		// TODO
	}

	// Deletes x. Returns false if x was not in the tree.
	// A node with two children takes the smallest value of its right subtree.
	bool remove(Node *&n, int x) {
		// TODO
		return false;
	}

	// Frees every node of the subtree. Already written.
	void destroy(Node *n) {
		if (n == nullptr) return;
		destroy(n->left);
		destroy(n->right);
		delete n;
	}
};

#endif

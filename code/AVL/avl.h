/*
 * AVL tree of ints. Values do not repeat.
 * A leaf has height 0 and an empty subtree has height -1.
 * Complete the private methods marked with TODO, in the order of this file: each one uses the
 * ones before it. Do not change the rest of the class.
 *
 * Student ID:
 * Date:
 */

#ifndef AVL_H
#define AVL_H

#include <algorithm>
#include <iostream>
using namespace std;

struct AVLNode {
	int info;
	int height;
	AVLNode *left;
	AVLNode *right;
};

class AVL {
public:
	AVL() = default;
	~AVL() { destroy(root); }

	// Copying is disabled so that two trees never own the same nodes.
	AVL(const AVL &) = delete;
	AVL &operator=(const AVL &) = delete;

	// Each public method calls the private method with the same name, starting at root.
	void insert(int x) { root = insert(root, x); }
	void remove(int x) { root = remove(root, x); }
	AVLNode *search(int x) const { return search(root, x); }
	int height() const { return height(root); }

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
	AVLNode *root = nullptr;

	// The tests call the private methods one by one.
	friend struct AVLTester;

	// Returns the height stored in n, or -1 for an empty subtree.
	int height(AVLNode *n) const {
		// TODO
		return 0;
	}

	// Returns the height of the right subtree minus the height of the left subtree.
	int bf(AVLNode *n) const {
		// TODO
		return 0;
	}

	// Recomputes the height of n from the heights of its children.
	void update(AVLNode *n) {
		// TODO
	}

	// Rotates the subtree to the left: the right child of a rises. Returns the new root of the subtree.
	AVLNode *rotateLeft(AVLNode *a) {
		// TODO
		return a;
	}

	// Rotates the subtree to the right: the left child of a rises. Returns the new root of the subtree.
	AVLNode *rotateRight(AVLNode *a) {
		// TODO
		return a;
	}

	// Updates the height of n, rotates if its balance factor is 2 or -2, and returns the root of the subtree.
	AVLNode *rebalance(AVLNode *n) {
		// TODO
		return n;
	}

	// Inserts x and rebalances the path on the way back. Returns the root of the subtree.
	// A repeated value changes nothing.
	AVLNode *insert(AVLNode *n, int x) {
		// TODO
		return n;
	}

	// Removes x and rebalances the path on the way back. Returns the root of the subtree.
	// A node with two children takes the smallest value of its right subtree.
	AVLNode *remove(AVLNode *n, int x) {
		// TODO
		return n;
	}

	// The methods below are already written.

	AVLNode *search(AVLNode *n, int x) const {
		if (n == nullptr) return nullptr;
		if (x < n->info) return search(n->left, x);
		if (x > n->info) return search(n->right, x);
		return n;
	}

	void preorder(AVLNode *n) const {
		if (n == nullptr) return;
		cout << n->info << " ";
		preorder(n->left);
		preorder(n->right);
	}

	void inorder(AVLNode *n) const {
		if (n == nullptr) return;
		inorder(n->left);
		cout << n->info << " ";
		inorder(n->right);
	}

	void destroy(AVLNode *n) {
		if (n == nullptr) return;
		destroy(n->left);
		destroy(n->right);
		delete n;
	}
};

#endif

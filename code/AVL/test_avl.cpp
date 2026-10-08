/*
 * Tests for the class AVL of avl.h: 6 tests for each exercise. You do not need to change this file.
 *
 *   g++ -std=c++17 test_avl.cpp -o test_avl
 *   ./test_avl
 *
 * Date: 2026-10-07
 */

#include <functional>
#include <initializer_list>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#ifdef USE_SOLUTION
#include "avl_solution.h"
#else
#include "avl.h"
#endif

using namespace std;

// ------------------------------------------------------------ running the tests

string groupName = "";
int groupRun = 0;
int groupPassed = 0;
int totalRun = 0;
int totalPassed = 0;
vector<string> summary;

// What a test that fails shows.
string shownTree = "";
string shownCall = "";
string shownExpected = "";
string shownGot = "";
string shownNote = "";

void closeGroup() {
	if (groupName != "") {
		ostringstream line;
		line << "  " << left << setw(32) << groupName << groupPassed << " of " << groupRun;
		summary.push_back(line.str());
		totalRun += groupRun;
		totalPassed += groupPassed;
	}
}

void group(const string &name) {
	closeGroup();
	groupName = name;
	groupRun = 0;
	groupPassed = 0;
	cout << "\n" << name << endl;
}

// Prints the name of the test before running it: if the program crashes, the last name shown is the test to check.
void test(const string &name, const function<bool()> &body) {
	groupRun++;
	shownNote = "";
	cout << "  " << groupRun << ". " << name << ": " << flush;
	bool passed = body();
	if (passed) {
		groupPassed++;
		cout << "PASS" << endl;
	} else {
		cout << "FAIL" << endl;
		cout << "       tree:     " << shownTree << endl;
		cout << "       call:     " << shownCall << endl;
		cout << "       expected: " << shownExpected << endl;
		cout << "       got:      " << shownGot << endl;
		if (shownNote != "") {
			cout << "                 " << shownNote << endl;
		}
	}
}

// The text as it is shown when a test fails: line breaks appear as \n.
string visible(const string &text) {
	string shown = "";
	for (char c : text) {
		if (c == '\n') {
			shown += "\\n";
		} else {
			shown += c;
		}
	}
	if (shown == "") {
		shown = "(nothing)";
	}
	return shown;
}

bool same(const string &got, const string &expected) {
	shownExpected = visible(expected);
	shownGot = visible(got);
	return got == expected;
}

bool same(int got, int expected) {
	return same(to_string(got), to_string(expected));
}

// The values separated by spaces, or "(empty)".
string listOf(initializer_list<int> values) {
	string text = "";
	for (int value : values) {
		if (text != "") {
			text += " ";
		}
		text += to_string(value);
	}
	if (text == "") {
		text = "(empty)";
	}
	return text;
}

// ------------------------------------------------------------ trees of the tests
// AVLTester is a friend of AVL. It builds each tree by hand, without rotations, and calls the
// private methods one by one, so each method is tested on its own.

struct AVLTester {
	// Puts x where a search for it ends, without rotations.
	static void place(AVLNode *&n, int x) {
		if (n == nullptr) {
			n = new AVLNode{x, 0, nullptr, nullptr};
		} else if (x < n->info) {
			place(n->left, x);
		} else if (x > n->info) {
			place(n->right, x);
		}
	}

	// Stores in every node its height and returns the height of the subtree (-1 when it is empty).
	static int setHeights(AVLNode *n) {
		int result = -1;
		if (n != nullptr) {
			int leftHeight = setHeights(n->left);
			int rightHeight = setHeights(n->right);
			n->height = 1 + max(leftHeight, rightHeight);
			result = n->height;
		}
		return result;
	}

	// Builds the tree of the values, without rotations and with correct heights.
	static AVLNode *build(initializer_list<int> values) {
		AVLNode *root = nullptr;
		for (int value : values) {
			place(root, value);
		}
		setHeights(root);
		return root;
	}

	static AVLNode *find(AVLNode *n, int x) {
		AVLNode *current = n;
		while (current != nullptr && current->info != x) {
			if (x < current->info) {
				current = current->left;
			} else {
				current = current->right;
			}
		}
		return current;
	}

	// Adds the subtree in preorder, each node as value(height). It stops after `limit` nodes, so a tree
	// whose pointers form a cycle does not print forever.
	static void collect(AVLNode *n, string &text, int &limit) {
		if (n != nullptr && limit > 0) {
			limit--;
			if (text != "") {
				text += " ";
			}
			text += to_string(n->info) + "(" + to_string(n->height) + ")";
			collect(n->left, text, limit);
			collect(n->right, text, limit);
		}
	}

	// The tree in preorder, or "(empty)". The tests do not free the nodes: a wrong rotation can leave
	// a cycle of pointers, and freeing it would crash. That is why the tree lets go of its root.
	static string showAndRelease(AVL &tree) {
		string text = "";
		int limit = 200;
		collect(tree.root, text, limit);
		if (text == "") {
			text = "(empty)";
		}
		tree.root = nullptr;
		return text;
	}

	// ---- one call to each method

	// Puts a wrong height in the node that holds target, calls update and bf on it, and returns both results.
	static string heightAndBf(initializer_list<int> values, int target) {
		shownTree = listOf(values);
		shownCall = "update(n) and then bf(n), where n is the node " + to_string(target);
		shownNote = "(the test sets n->height to 99 before it calls update)";
		AVL tree;
		tree.root = build(values);
		AVLNode *n = find(tree.root, target);
		n->height = 99;
		tree.update(n);
		string text = "height " + to_string(n->height) + ", bf " + to_string(tree.bf(n));
		tree.root = nullptr;
		return text;
	}

	static string rotatedLeft(initializer_list<int> values) {
		shownTree = listOf(values);
		shownCall = "rotateLeft(root)";
		AVL tree;
		tree.root = build(values);
		tree.root = tree.rotateLeft(tree.root);
		return showAndRelease(tree);
	}

	static string rotatedRight(initializer_list<int> values) {
		shownTree = listOf(values);
		shownCall = "rotateRight(root)";
		AVL tree;
		tree.root = build(values);
		tree.root = tree.rotateRight(tree.root);
		return showAndRelease(tree);
	}

	// Leaves the tree as an insertion leaves it just before it returns to the root: every height is
	// correct except the one of the root, which keeps the value it had before the last value was inserted.
	static string rebalanced(initializer_list<int> values) {
		shownTree = listOf(values);
		shownCall = "rebalance(root)";
		shownNote = "(the root still has the height it had before the last value was inserted)";
		AVL tree;
		int oldRootHeight = 0;
		int position = 0;
		int last = static_cast<int>(values.size()) - 1;
		for (int value : values) {
			if (position == last && tree.root != nullptr) {
				setHeights(tree.root);
				oldRootHeight = tree.root->height;
			}
			place(tree.root, value);
			position++;
		}
		setHeights(tree.root);
		tree.root->height = oldRootHeight;
		tree.root = tree.rebalance(tree.root);
		return showAndRelease(tree);
	}

	// Inserts the values into an empty tree with the insert of the class.
	static string inserted(initializer_list<int> values) {
		shownTree = "(empty)";
		shownCall = "tree.insert(x) with x = " + listOf(values);
		AVL tree;
		for (int value : values) {
			tree.insert(value);
		}
		return showAndRelease(tree);
	}

	static string removed(initializer_list<int> values, int x) {
		shownTree = listOf(values);
		shownCall = "tree.remove(" + to_string(x) + ")";
		AVL tree;
		tree.root = build(values);
		tree.remove(x);
		return showAndRelease(tree);
	}
};

// ------------------------------------------------------------ the tests

int main() {
	cout << "The tests call each private method on its own. Complete the methods in the order of avl.h:" << endl;
	cout << "each one uses the ones before it." << endl;
	cout << "A test that fails shows its tree as the values in the order they were inserted, without" << endl;
	cout << "rotations. The results show a tree in preorder, each node as value(height)." << endl;

	group("height, bf, update");
	test("right side taller", [] { return same(AVLTester::heightAndBf({50, 30, 70, 20, 40, 80, 10}, 70), "height 1, bf 1"); });
	test("left side taller", [] { return same(AVLTester::heightAndBf({50, 30, 70, 20, 40, 80, 10}, 50), "height 3, bf -1"); });
	test("leaf", [] { return same(AVLTester::heightAndBf({50, 30, 70, 20, 40, 80, 10}, 40), "height 0, bf 0"); });
	test("left side taller by two", [] { return same(AVLTester::heightAndBf({60, 40, 80, 30, 50, 20, 10}, 40), "height 3, bf -2"); });
	test("values inserted in ascending order", [] { return same(AVLTester::heightAndBf({1, 2, 3, 4}, 1), "height 3, bf 3"); });
	test("node with only a left child", [] { return same(AVLTester::heightAndBf({-10, -30, 10, -40, -20, 20, -50}, -40), "height 1, bf -1"); });

	group("rotateLeft");
	test("path of three nodes", [] { return same(AVLTester::rotatedLeft({10, 20, 30}), "20(1) 10(0) 30(0)"); });
	test("the subtree T2 changes parent", [] { return same(AVLTester::rotatedLeft({10, 5, 20, 15, 30}), "20(2) 10(1) 5(0) 15(0) 30(0)"); });
	test("path of four nodes", [] { return same(AVLTester::rotatedLeft({10, 20, 30, 40}), "20(2) 10(0) 30(1) 40(0)"); });
	test("root with a left child", [] { return same(AVLTester::rotatedLeft({20, 10, 30, 40, 50}), "30(2) 20(1) 10(0) 40(1) 50(0)"); });
	test("larger tree with negative values", [] { return same(AVLTester::rotatedLeft({-10, -20, 10, 0, 20, -5, 5}), "10(3) -10(2) -20(0) 0(1) -5(0) 5(0) 20(0)"); });
	test("right child with only a left child", [] { return same(AVLTester::rotatedLeft({10, 30, 20}), "30(2) 10(1) 20(0)"); });

	group("rotateRight");
	test("path of three nodes", [] { return same(AVLTester::rotatedRight({30, 20, 10}), "20(1) 10(0) 30(0)"); });
	test("the subtree T2 changes parent", [] { return same(AVLTester::rotatedRight({30, 40, 20, 25, 10}), "20(2) 10(0) 30(1) 25(0) 40(0)"); });
	test("path of four nodes", [] { return same(AVLTester::rotatedRight({40, 30, 20, 10}), "30(2) 20(1) 10(0) 40(0)"); });
	test("root with a right child", [] { return same(AVLTester::rotatedRight({40, 50, 30, 20, 10}), "30(2) 20(1) 10(0) 40(1) 50(0)"); });
	test("larger tree with negative values", [] { return same(AVLTester::rotatedRight({10, 20, -10, 0, -20, 5, -5}), "-10(3) -20(0) 10(2) 0(1) -5(0) 5(0) 20(0)"); });
	test("left child with only a right child", [] { return same(AVLTester::rotatedRight({30, 10, 20}), "10(2) 30(1) 20(0)"); });

	group("rebalance");
	test("right-right: one rotation", [] { return same(AVLTester::rebalanced({10, 20, 30}), "20(1) 10(0) 30(0)"); });
	test("right-left: two rotations", [] { return same(AVLTester::rebalanced({10, 20, 15}), "15(1) 10(0) 20(0)"); });
	test("already balanced, only the height changes", [] { return same(AVLTester::rebalanced({50, 30, 70, 20}), "50(2) 30(1) 20(0) 70(0)"); });
	test("left-left in a larger tree", [] { return same(AVLTester::rebalanced({50, 30, 70, 20, 40, 10}), "30(2) 20(1) 10(0) 50(1) 40(0) 70(0)"); });
	test("left-right in a larger tree", [] { return same(AVLTester::rebalanced({50, 30, 70, 20, 40, 45}), "40(2) 30(1) 20(0) 50(1) 45(0) 70(0)"); });
	test("taller child with balance factor 0: one rotation", [] { return same(AVLTester::rebalanced({20, 40, 30, 50}), "40(2) 20(1) 30(0) 50(0)"); });

	group("insert");
	test("one rotation", [] { return same(AVLTester::inserted({10, 20, 30}), "20(1) 10(0) 30(0)"); });
	test("two rotations", [] { return same(AVLTester::inserted({32, 56, 43}), "43(1) 32(0) 56(0)"); });
	test("repeated value", [] { return same(AVLTester::inserted({50, 30, 70, 30}), "50(1) 30(0) 70(0)"); });
	test("values in ascending order", [] { return same(AVLTester::inserted({1, 3, 5, 6, 7, 8, 9}), "6(2) 3(1) 1(0) 5(0) 8(1) 7(0) 9(0)"); });
	test("negative values in descending order", [] { return same(AVLTester::inserted({-1, -2, -3, -4, -5, -6, -7, -8}), "-4(3) -6(2) -7(1) -8(0) -5(0) -2(1) -3(0) -1(0)"); });
	test("larger tree with repeated values", [] { return same(AVLTester::inserted({50, 20, 60, 10, 8, 15, 32, 46, 11, 48, 20, 46, 9, 13, 60}), "20(3) 10(2) 8(1) 9(0) 13(1) 11(0) 15(0) 50(2) 46(1) 32(0) 48(0) 60(0)"); });

	group("remove");
	test("node with one child", [] { return same(AVLTester::removed({50, 30, 70, 20, 40, 60, 80, 10}, 20), "50(2) 30(1) 10(0) 40(0) 70(1) 60(0) 80(0)"); });
	test("leaf, then one rotation", [] { return same(AVLTester::removed({50, 30, 70, 20, 40, 60, 80, 10}, 40), "50(2) 20(1) 10(0) 30(0) 70(1) 60(0) 80(0)"); });
	test("node with two children", [] { return same(AVLTester::removed({50, 30, 70, 20, 40, 60, 80, 10}, 50), "60(3) 30(2) 20(1) 10(0) 40(0) 70(1) 80(0)"); });
	test("value not in the tree", [] { return same(AVLTester::removed({50, 30, 70, 20, 40, 60, 80, 10}, 65), "50(3) 30(2) 20(1) 10(0) 40(0) 70(1) 60(0) 80(0)"); });
	test("node with only a left child, then two rotations", [] { return same(AVLTester::removed({50, 30, 70, 20, 40, 60, 35}, 70), "40(2) 30(1) 20(0) 35(0) 50(1) 60(0)"); });
	test("node with two children, negative values", [] { return same(AVLTester::removed({-30, -40, -20, -50, -35}, -30), "-40(2) -50(0) -20(1) -35(0)"); });

	closeGroup();
	cout << "\nSummary" << endl;
	for (const string &line : summary) {
		cout << line << endl;
	}
	cout << "\n" << totalPassed << " of " << totalRun << " tests passed" << endl;
	return totalPassed == totalRun ? 0 : 1;
}

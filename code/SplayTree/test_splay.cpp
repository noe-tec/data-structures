/*
 * Tests for the class SplayTree of splay.h: 6 tests for each method you complete. You do not need to
 * change this file.
 *
 *   g++ -std=c++17 test_splay.cpp -o test_splay
 *   ./test_splay
 *
 * If the program crashes, or stops and shows nothing more, the last test shown is the one to check.
 * It is usually a wrong parent link in rotateRight or rotateLeft, which splay then follows.
 *
 * Date: 2026-10-11
 */

#include <functional>
#include <initializer_list>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#ifdef USE_SOLUTION
#include "splay_solution.h"
#else
#include "splay.h"
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

// Prints the name of the test before running it: if the program crashes or stops, the last name shown
// is the test to check.
void test(const string &name, const function<bool()> &body) {
	groupRun++;
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
	}
}

bool same(const string &got, const string &expected) {
	shownExpected = expected;
	shownGot = got;
	return got == expected;
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
// SplayTester is a friend of SplayTree. It builds each tree by hand, as a plain BST with correct parent
// links and no splaying, and calls the methods one by one, so each method is tested on its own.

struct SplayTester {
	// Puts x where a search for it ends, without splaying.
	static void place(Node *&n, Node *parent, int x) {
		if (n == nullptr) {
			n = new Node{x, nullptr, nullptr, parent};
		} else if (x < n->info) {
			place(n->left, n, x);
		} else if (x > n->info) {
			place(n->right, n, x);
		}
	}

	static Node *build(initializer_list<int> values) {
		Node *root = nullptr;
		for (int value : values) {
			place(root, nullptr, value);
		}
		return root;
	}

	static Node *find(Node *n, int x) {
		Node *current = n;
		while (current != nullptr && current->info != x) {
			if (x < current->info) {
				current = current->left;
			} else {
				current = current->right;
			}
		}
		return current;
	}

	// Adds the subtree in preorder. It stops after `limit` nodes, so a tree whose pointers form a
	// cycle does not print forever.
	static void collect(Node *n, string &text, int &limit) {
		if (n != nullptr && limit > 0) {
			limit--;
			if (text != "") {
				text += " ";
			}
			text += to_string(n->info);
			collect(n->left, text, limit);
			collect(n->right, text, limit);
		}
	}

	static string name(Node *n) { return n == nullptr ? "nullptr" : to_string(n->info); }

	// Looks for the first node whose parent link does not match the child links.
	static string wrongParent(Node *n, Node *parent, int &limit) {
		string problem = "";
		if (n != nullptr && limit > 0) {
			limit--;
			if (n->parent != parent) {
				problem = "the parent of " + to_string(n->info) + " is " + name(n->parent) + ", it should be " + name(parent);
			}
			if (problem == "") {
				problem = wrongParent(n->left, n, limit);
			}
			if (problem == "") {
				problem = wrongParent(n->right, n, limit);
			}
		}
		return problem;
	}

	// The tree in preorder, or "(empty)", followed by the first wrong parent link, if any. The tests do
	// not free the nodes: a wrong rotation can leave a cycle of pointers, and freeing it would crash.
	// That is why the tree lets go of its root.
	static string showAndRelease(SplayTree &tree) {
		string text = "";
		int limit = 200;
		collect(tree.root, text, limit);
		if (text == "") {
			text = "(empty)";
		}
		limit = 200;
		string problem = wrongParent(tree.root, nullptr, limit);
		if (problem != "") {
			text += "  [" + problem + "]";
		}
		tree.root = nullptr;
		return text;
	}

	static string answer(bool result) { return result ? "true: " : "false: "; }

	// ---- one call to each method

	static string rotatedRight(initializer_list<int> values, int a) {
		shownTree = listOf(values);
		shownCall = "rotateRight(a), where a is the node " + to_string(a);
		SplayTree tree;
		tree.root = build(values);
		tree.rotateRight(find(tree.root, a));
		return showAndRelease(tree);
	}

	static string rotatedLeft(initializer_list<int> values, int a) {
		shownTree = listOf(values);
		shownCall = "rotateLeft(a), where a is the node " + to_string(a);
		SplayTree tree;
		tree.root = build(values);
		tree.rotateLeft(find(tree.root, a));
		return showAndRelease(tree);
	}

	static string splayed(initializer_list<int> values, int x) {
		shownTree = listOf(values);
		shownCall = "splay(x), where x is the node " + to_string(x);
		SplayTree tree;
		tree.root = build(values);
		tree.splay(find(tree.root, x));
		return showAndRelease(tree);
	}

	static string contained(initializer_list<int> values, int x) {
		shownTree = listOf(values);
		shownCall = "tree.contains(" + to_string(x) + ")";
		SplayTree tree;
		tree.root = build(values);
		bool result = tree.contains(x);
		return answer(result) + showAndRelease(tree);
	}

	static string insertedInto(initializer_list<int> values, int x) {
		shownTree = listOf(values);
		shownCall = "tree.insert(" + to_string(x) + ")";
		SplayTree tree;
		tree.root = build(values);
		bool result = tree.insert(x);
		return answer(result) + showAndRelease(tree);
	}

	// Inserts the values into an empty tree with the insert of the class.
	static string inserted(initializer_list<int> values) {
		shownTree = "(empty)";
		shownCall = "tree.insert(x) with x = " + listOf(values);
		SplayTree tree;
		for (int value : values) {
			tree.insert(value);
		}
		return showAndRelease(tree);
	}

	static string removed(initializer_list<int> values, int x) {
		shownTree = listOf(values);
		shownCall = "tree.remove(" + to_string(x) + ")";
		SplayTree tree;
		tree.root = build(values);
		bool result = tree.remove(x);
		return answer(result) + showAndRelease(tree);
	}
};

// ------------------------------------------------------------ the tests

int main() {
	cout << "The tests call each method on its own. Complete the methods in the order of splay.h:" << endl;
	cout << "each one uses the ones before it." << endl;
	cout << "A test that fails shows its tree as the values in the order they were inserted into a plain" << endl;
	cout << "BST, without splaying. The results show a tree in preorder; a wrong parent link is shown in [ ]." << endl;
	cout << "contains, insert and remove also show what they returned." << endl;

	group("rotateRight");
	test("rotation at the root", [] { return same(SplayTester::rotatedRight({30, 20, 10}, 30), "20 10 30"); });
	test("the middle subtree changes parent", [] { return same(SplayTester::rotatedRight({30, 40, 20, 25, 10}, 30), "20 10 30 25 40"); });
	test("a is a left child: its parent now points to b", [] { return same(SplayTester::rotatedRight({50, 30, 70, 20, 40, 10}, 30), "50 20 10 30 40 70"); });
	test("a is a right child", [] { return same(SplayTester::rotatedRight({10, 5, 30, 20, 40, 15, 25}, 30), "10 5 20 15 30 25 40"); });
	test("b has no right child", [] { return same(SplayTester::rotatedRight({30, 20, 40}, 30), "20 30 40"); });
	test("larger tree with negative values", [] { return same(SplayTester::rotatedRight({10, 20, -10, 0, -20, 5, -5}, 10), "-10 -20 10 0 -5 5 20"); });

	group("rotateLeft");
	test("rotation at the root", [] { return same(SplayTester::rotatedLeft({10, 20, 30}, 10), "20 10 30"); });
	test("the middle subtree changes parent", [] { return same(SplayTester::rotatedLeft({10, 5, 20, 15, 30}, 10), "20 10 5 15 30"); });
	test("a is a right child: its parent now points to b", [] { return same(SplayTester::rotatedLeft({50, 30, 70, 60, 80, 90}, 70), "50 30 80 70 60 90"); });
	test("a is a left child", [] { return same(SplayTester::rotatedLeft({40, 20, 50, 10, 30, 25, 35}, 20), "40 30 20 10 25 35 50"); });
	test("b has no left child", [] { return same(SplayTester::rotatedLeft({20, 10, 30}, 20), "30 20 10"); });
	test("larger tree with negative values", [] { return same(SplayTester::rotatedLeft({-10, -20, 10, 0, 20, -5, 5}, -10), "10 -10 -20 0 -5 5 20"); });

	group("splay");
	test("zig: x is the left child of the root", [] { return same(SplayTester::splayed({20, 10, 30}, 10), "10 20 30"); });
	test("zag-zag", [] { return same(SplayTester::splayed({10, 20, 30}, 30), "30 20 10"); });
	test("zig-zag", [] { return same(SplayTester::splayed({30, 10, 20}, 20), "20 10 30"); });
	test("zag-zig, then zig", [] { return same(SplayTester::splayed({50, 30, 60, 10, 40, 35}, 35), "35 30 10 50 40 60"); });
	test("x is already the root", [] { return same(SplayTester::splayed({20, 10, 30}, 20), "20 10 30"); });
	test("a chain: three zig-zigs", [] { return same(SplayTester::splayed({7, 6, 5, 4, 3, 2, 1}, 1), "1 6 4 2 3 5 7"); });

	group("contains");
	test("found at the root", [] { return same(SplayTester::contained({50, 30, 70}, 50), "true: 50 30 70"); });
	test("found: one zig-zig", [] { return same(SplayTester::contained({132, 89, 256, 52, 167, 402, 190}, 52), "true: 52 89 132 256 167 190 402"); });
	test("found: a zig-zag, then a zag", [] { return same(SplayTester::contained({132, 89, 256, 52, 167, 402, 190}, 190), "true: 190 132 89 52 167 256 402"); });
	test("not in the tree: the last node of the path rises", [] { return same(SplayTester::contained({132, 89, 256, 52, 167, 402, 190}, 100), "false: 89 52 132 256 167 190 402"); });
	test("greater than every value", [] { return same(SplayTester::contained({132, 89, 256, 52, 167, 402, 190}, 500), "false: 402 256 132 89 52 167 190"); });
	test("empty tree", [] { return same(SplayTester::contained({}, 5), "false: (empty)"); });

	group("insert");
	test("empty tree", [] { return same(SplayTester::insertedInto({}, 5), "true: 5"); });
	test("the example of the slides: zig-zag, then zig", [] { return same(SplayTester::insertedInto({132, 89, 256, 52, 167, 402, 190}, 60), "true: 60 52 132 89 256 167 190 402"); });
	test("repeated value: no new node, but it rises", [] { return same(SplayTester::insertedInto({132, 89, 256, 52, 167, 402, 190}, 167), "false: 167 132 89 52 256 190 402"); });
	test("two zag-zigs", [] { return same(SplayTester::insertedInto({132, 89, 256, 52, 167, 402, 190}, 180), "true: 180 132 89 52 167 256 190 402"); });
	test("1 to 7 in order: a chain", [] { return same(SplayTester::inserted({1, 2, 3, 4, 5, 6, 7}), "7 6 5 4 3 2 1"); });
	test("negative values", [] { return same(SplayTester::inserted({-5, -10, 0, -7, 3, -8}), "-8 -10 0 -7 -5 3"); });

	group("remove");
	test("the example of the slides", [] { return same(SplayTester::removed({60, 52, 132, 89, 256, 167, 402, 190}, 167), "true: 132 60 52 89 256 190 402"); });
	test("not in the tree: false, and the last node rises", [] { return same(SplayTester::removed({132, 89, 256, 52, 167, 402, 190}, 100), "false: 89 52 132 256 167 190 402"); });
	test("the root has no left subtree", [] { return same(SplayTester::removed({10, 20, 30}, 10), "true: 20 30"); });
	test("the only node", [] { return same(SplayTester::removed({5}, 5), "true: (empty)"); });
	test("empty tree", [] { return same(SplayTester::removed({}, 5), "false: (empty)"); });
	test("a leaf deep in the tree", [] { return same(SplayTester::removed({132, 89, 256, 52, 167, 402, 190}, 190), "true: 167 132 89 52 256 402"); });

	closeGroup();
	cout << "\nSummary" << endl;
	for (const string &line : summary) {
		cout << line << endl;
	}
	cout << "\n" << totalPassed << " of " << totalRun << " tests passed" << endl;
	return totalPassed == totalRun ? 0 : 1;
}

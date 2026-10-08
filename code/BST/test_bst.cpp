/*
 * Tests for the class BST of bst.h: 6 tests for each exercise. You do not need to change this file.
 *
 *   g++ -std=c++17 test_bst.cpp -o test_bst
 *   ./test_bst
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
#include "bst_solution.h"
#else
#include "bst.h"
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
// The tests use only the public methods: they build each tree with insert and show it with preorder.

void fill(BST &tree, initializer_list<int> values) {
	for (int value : values) {
		tree.insert(value);
	}
}

// What print() writes on the screen, without the spaces and line breaks at the end.
string printed(const function<void()> &print) {
	ostringstream output;
	streambuf *screen = cout.rdbuf(output.rdbuf());
	print();
	cout.rdbuf(screen);
	string text = output.str();
	while (!text.empty() && (text.back() == ' ' || text.back() == '\n')) {
		text.pop_back();
	}
	return text;
}

// The tree in preorder, or "(empty)".
string preorderOf(const BST &tree) {
	string text = printed([&] { tree.preorder(); });
	if (text == "") {
		text = "(empty)";
	}
	return text;
}

// ------------------------------------------------------------ one call to each method

// Inserts the values into an empty tree: what each call returned, then the tree in preorder.
string insertAll(initializer_list<int> values) {
	shownTree = "(empty)";
	shownCall = "tree.insert(x) with x = " + listOf(values);
	shownNote = "(what each call returned | the tree in preorder)";
	BST tree;
	string text = "";
	for (int value : values) {
		text += tree.insert(value) ? "true " : "false ";
	}
	return text + "| " + preorderOf(tree);
}

// What the method prints for the tree built with the values.
string printedBy(const string &name, void (BST::*print)() const, initializer_list<int> values) {
	shownTree = listOf(values);
	shownCall = "tree." + name + "()";
	BST tree;
	fill(tree, values);
	return printed([&] { (tree.*print)(); });
}

// "found" when search returns the node that holds x, "not found" when it returns nullptr.
string searchIn(initializer_list<int> values, int x) {
	shownTree = listOf(values);
	shownCall = "tree.search(" + to_string(x) + ")";
	BST tree;
	fill(tree, values);
	Node *result = tree.search(x);
	string text = "wrong node";
	if (result == nullptr) {
		text = "not found";
	} else if (result->info == x) {
		text = "found";
	}
	return text;
}

int heightOf(initializer_list<int> values) {
	shownTree = listOf(values);
	shownCall = "tree.height()";
	BST tree;
	fill(tree, values);
	return tree.height();
}

int depthIn(initializer_list<int> values, int x) {
	shownTree = listOf(values);
	shownCall = "tree.depth(" + to_string(x) + ")";
	BST tree;
	fill(tree, values);
	return tree.depth(x);
}

// Removes x: what the call returned, then the tree in preorder.
string removeFrom(initializer_list<int> values, int x) {
	shownTree = listOf(values);
	shownCall = "tree.remove(" + to_string(x) + ")";
	shownNote = "(what it returned | the tree in preorder)";
	BST tree;
	fill(tree, values);
	string text = tree.remove(x) ? "true " : "false ";
	return text + "| " + preorderOf(tree);
}

// ------------------------------------------------------------ the tests

int main() {
	cout << "Every test builds its tree with your insert, and the tests of insert and remove show it" << endl;
	cout << "with your preorder: complete those two methods first." << endl;
	cout << "A test that fails shows its tree: the values in the order they were inserted." << endl;

	group("insert");
	test("three values", [] { return same(insertAll({50, 30, 70}), "true true true | 50 30 70"); });
	test("seven values, three levels", [] { return same(insertAll({50, 30, 70, 20, 40, 60, 80}), "true true true true true true true | 50 30 20 40 70 60 80"); });
	test("repeated value", [] { return same(insertAll({50, 30, 70, 30}), "true true true false | 50 30 70"); });
	test("values in ascending order", [] { return same(insertAll({1, 2, 3, 4, 5}), "true true true true true | 1 2 3 4 5"); });
	test("negative values", [] { return same(insertAll({-10, -30, 5, -20, 0, -40}), "true true true true true true | -10 -30 -40 -20 5 0"); });
	test("several repeated values", [] { return same(insertAll({10, 5, 15, 5, 20, 10, 15}), "true true true false true false false | 10 5 15 20"); });

	group("preorder, inorder, postorder");
	test("preorder", [] { return same(printedBy("preorder", &BST::preorder, {50, 30, 70, 20, 40, 60, 80}), "50 30 20 40 70 60 80"); });
	test("inorder", [] { return same(printedBy("inorder", &BST::inorder, {50, 30, 70, 20, 40, 60, 80}), "20 30 40 50 60 70 80"); });
	test("postorder", [] { return same(printedBy("postorder", &BST::postorder, {50, 30, 70, 20, 40, 60, 80}), "20 40 30 60 80 70 50"); });
	test("preorder with another tree", [] { return same(printedBy("preorder", &BST::preorder, {10, -5, 30, -20, 0, 20, 40, 15}), "10 -5 -20 0 30 20 15 40"); });
	test("inorder with another tree", [] { return same(printedBy("inorder", &BST::inorder, {9, 7, 8, 3, 1, 5}), "1 3 5 7 8 9"); });
	test("postorder with another tree", [] { return same(printedBy("postorder", &BST::postorder, {40, 20, 60, 10, 30, 50, 70, 25, 35, 65}), "10 25 35 30 20 50 65 70 60 40"); });

	group("search");
	test("value in a leaf", [] { return same(searchIn({50, 30, 70, 20, 40, 60, 80}, 60), "found"); });
	test("value at the root", [] { return same(searchIn({50, 30, 70, 20, 40, 60, 80}, 50), "found"); });
	test("value not in the tree", [] { return same(searchIn({50, 30, 70, 20, 40, 60, 80}, 65), "not found"); });
	test("value deep in the tree", [] { return same(searchIn({50, 25, 75, 10, 35, 60, 90, 30, 40, 33}, 33), "found"); });
	test("negative values", [] { return same(searchIn({-5, -20, 10, -30, -10, 0, 15}, -10), "found"); });
	test("values inserted in ascending order", [] { return same(searchIn({1, 2, 3, 4, 5, 6}, 6), "found"); });

	group("height");
	test("three full levels", [] { return same(heightOf({50, 30, 70, 20, 40, 60, 80}), 2); });
	test("only one node", [] { return same(heightOf({50}), 0); });
	test("values in ascending order", [] { return same(heightOf({1, 2, 3, 4}), 3); });
	test("deeper on the left side", [] { return same(heightOf({50, 30, 70, 20, 10}), 3); });
	test("path that goes left and right", [] { return same(heightOf({50, 20, 40, 30, 35, 60}), 4); });
	test("empty tree", [] { return same(heightOf({}), -1); });

	group("depth");
	test("node at depth 2", [] { return same(depthIn({50, 30, 70, 20, 40, 60, 80}, 40), 2); });
	test("the root", [] { return same(depthIn({50, 30, 70, 20, 40, 60, 80}, 50), 0); });
	test("value not in the tree", [] { return same(depthIn({50, 30, 70, 20, 40, 60, 80}, 65), -1); });
	test("deeper node", [] { return same(depthIn({50, 30, 70, 40, 35, 80}, 35), 3); });
	test("values inserted in ascending order", [] { return same(depthIn({1, 2, 3, 4}, 4), 3); });
	test("value not in a tree with negative values", [] { return same(depthIn({-5, -20, 10, -30, -10, 0, 15}, -15), -1); });

	group("levelOrder");
	test("three full levels", [] { return same(printedBy("levelOrder", &BST::levelOrder, {50, 30, 70, 20, 40, 60, 80}), "50 30 70 20 40 60 80"); });
	test("levels that are not full", [] { return same(printedBy("levelOrder", &BST::levelOrder, {50, 30, 70, 40, 35, 80}), "50 30 70 40 80 35"); });
	test("values inserted in ascending order", [] { return same(printedBy("levelOrder", &BST::levelOrder, {1, 2, 3, 4}), "1 2 3 4"); });
	test("empty tree", [] { return same(printedBy("levelOrder", &BST::levelOrder, {}), ""); });
	test("path that goes left and right", [] { return same(printedBy("levelOrder", &BST::levelOrder, {50, 20, 40, 30, 35, 60}), "50 20 60 40 30 35"); });
	test("larger tree with negative values", [] { return same(printedBy("levelOrder", &BST::levelOrder, {40, 20, -10, 30, 60, 50, 70, 25, 35, 65}), "40 20 60 -10 30 50 70 25 35 65"); });

	group("remove");
	test("node with no children", [] { return same(removeFrom({50, 30, 70, 20, 40, 60, 80, 45}, 20), "true | 50 30 40 45 70 60 80"); });
	test("node with one child", [] { return same(removeFrom({50, 30, 70, 20, 40, 60, 80, 45}, 40), "true | 50 30 20 45 70 60 80"); });
	test("node with two children", [] { return same(removeFrom({50, 30, 70, 20, 40, 60, 80, 45}, 30), "true | 50 40 20 45 70 60 80"); });
	test("remove the root", [] { return same(removeFrom({50, 30, 70, 60, 80, 65}, 50), "true | 60 30 70 65 80"); });
	test("value not in the tree", [] { return same(removeFrom({50, 30, 70, 20, 40, 60, 80, 45}, 65), "false | 50 30 20 40 45 70 60 80"); });
	test("node with only a left child", [] { return same(removeFrom({50, 30, 70, 20, 10, 60}, 30), "true | 50 20 10 70 60"); });

	closeGroup();
	cout << "\nSummary" << endl;
	for (const string &line : summary) {
		cout << line << endl;
	}
	cout << "\n" << totalPassed << " of " << totalRun << " tests passed" << endl;
	return totalPassed == totalRun ? 0 : 1;
}

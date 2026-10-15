/*
 * Tests for the class BinaryHeap of binary_heap.h: 6 tests for each method you complete. You do not
 * need to change this file.
 *
 *   g++ -std=c++17 test_binary_heap.cpp -o test_binary_heap
 *   ./test_binary_heap
 *
 * If the program crashes, or stops and shows nothing more, the last test shown is the one to check.
 *
 * Date: 2026-10-12
 */

#include <functional>
#include <initializer_list>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#ifdef USE_SOLUTION
#include "binary_heap_solution.h"
#else
#include "binary_heap.h"
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
string shownHeap = "";
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
		cout << "       array:    " << shownHeap << endl;
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

// ------------------------------------------------------------ heaps of the tests
// HeapTester is a friend of BinaryHeap. It copies the values into cells 1 to N, in the order given and
// without fixing anything, and calls the methods one by one, so each method is tested on its own.
// The cells after the heap hold 0, so a method that reads past the last element finds a 0.

struct HeapTester {
	static void fill(BinaryHeap &heap, initializer_list<int> values) {
		heap.array.assign(values.size() + 11, 0);
		heap.currentSize = 0;
		for (int value : values) {
			heap.currentSize++;
			heap.array[heap.currentSize] = value;
		}
	}

	// Cells 1 to currentSize, or "(empty)".
	static string show(const BinaryHeap &heap) {
		string text = "";
		for (int i = 1; i <= heap.currentSize; ++i) {
			if (text != "") {
				text += " ";
			}
			text += to_string(heap.array[i]);
		}
		if (text == "") {
			text = "(empty)";
		}
		return text;
	}

	// ---- one call to each method

	static string foundMin(initializer_list<int> values) {
		shownHeap = listOf(values);
		shownCall = "heap.findMin()";
		BinaryHeap heap;
		fill(heap, values);
		try {
			int result = heap.findMin();
			return to_string(result) + " | " + show(heap);
		} catch (const underflow_error &) {
			return "underflow_error";
		}
	}

	static string insertedInto(initializer_list<int> values, int x) {
		shownHeap = listOf(values);
		shownCall = "heap.insert(" + to_string(x) + ")";
		BinaryHeap heap;
		fill(heap, values);
		heap.insert(x);
		return show(heap);
	}

	// Inserts the values, one by one, into an empty heap with room for only one element: the array
	// has to grow.
	static string inserted(initializer_list<int> values) {
		shownHeap = "(empty, capacity 1)";
		shownCall = "heap.insert(x) with x = " + listOf(values);
		BinaryHeap heap(1);
		for (int value : values) {
			heap.insert(value);
		}
		return show(heap);
	}

	static string percolatedDown(initializer_list<int> values, int hole) {
		shownHeap = listOf(values);
		shownCall = "percolateDown(" + to_string(hole) + ")";
		BinaryHeap heap;
		fill(heap, values);
		heap.percolateDown(hole);
		return show(heap);
	}

	static string deletedMin(initializer_list<int> values) {
		shownHeap = listOf(values);
		shownCall = "heap.deleteMin()";
		BinaryHeap heap;
		fill(heap, values);
		try {
			heap.deleteMin();
			return show(heap);
		} catch (const underflow_error &) {
			return "underflow_error";
		}
	}

	// findMin and deleteMin until the heap is empty: the values must come out in order.
	static string drained(initializer_list<int> values) {
		shownHeap = listOf(values);
		shownCall = "findMin() and deleteMin() until the heap is empty";
		BinaryHeap heap;
		fill(heap, values);
		string text = "";
		int limit = 100;
		while (!heap.isEmpty() && limit > 0) {
			limit--;
			if (text != "") {
				text += " ";
			}
			text += to_string(heap.findMin());
			heap.deleteMin();
		}
		return text;
	}

	static string built(initializer_list<int> values) {
		shownHeap = listOf(values);
		shownCall = "buildHeap()";
		BinaryHeap heap;
		fill(heap, values);
		heap.buildHeap();
		return show(heap);
	}
};

// ------------------------------------------------------------ the tests

int main() {
	cout << "The tests call each method on its own. Complete the methods in the order of binary_heap.h." << endl;
	cout << "A test that fails shows the array, cells 1 to N, as it was before the call. The results show" << endl;
	cout << "the array after the call; findMin also shows what it returned, before the |." << endl;

	group("findMin");
	test("the minimum is the root", [] { return same(HeapTester::foundMin({13, 21, 16, 24, 31, 19, 68}), "13 | 13 21 16 24 31 19 68"); });
	test("only one element", [] { return same(HeapTester::foundMin({5}), "5 | 5"); });
	test("negative values", [] { return same(HeapTester::foundMin({-8, -3, -1, 0, 2, 7}), "-8 | -8 -3 -1 0 2 7"); });
	test("the minimum is repeated", [] { return same(HeapTester::foundMin({4, 4, 9, 4}), "4 | 4 4 9 4"); });
	test("it does not change the heap", [] { return same(HeapTester::foundMin({1, 2, 3, 4, 5, 6, 7}), "1 | 1 2 3 4 5 6 7"); });
	test("empty heap: underflow_error", [] { return same(HeapTester::foundMin({}), "underflow_error"); });

	group("insert");
	test("empty heap", [] { return same(HeapTester::insertedInto({}, 5), "5"); });
	test("the example of the slides: insert(14)", [] { return same(HeapTester::insertedInto({13, 21, 16, 24, 31, 19, 68, 65, 26, 32}, 14), "13 14 16 24 21 19 68 65 26 32 31"); });
	test("greater than its parent: it stays at the end", [] { return same(HeapTester::insertedInto({10, 20, 15}, 40), "10 20 15 40"); });
	test("a new minimum climbs to the root", [] { return same(HeapTester::insertedInto({10, 20, 15, 30, 40}, 5), "5 20 10 30 40 15"); });
	test("equal to its parent: it stays", [] { return same(HeapTester::insertedInto({10, 20, 15}, 20), "10 20 15 20"); });
	test("from capacity 1: the array grows", [] { return same(HeapTester::inserted({5, 4, 3, 2, 1, 0}), "0 2 1 5 3 4"); });

	group("percolateDown");
	test("the example of the slides: 31 sinks from the root", [] { return same(HeapTester::percolatedDown({31, 14, 16, 19, 21, 19, 68, 65, 26, 32}, 1), "14 19 16 26 21 19 68 65 31 32"); });
	test("already in order: nothing moves", [] { return same(HeapTester::percolatedDown({10, 20, 15, 30, 40}, 1), "10 20 15 30 40"); });
	test("a node with only a left child", [] { return same(HeapTester::percolatedDown({40, 10, 30, 20}, 1), "10 20 30 40"); });
	test("from a cell that is not the root", [] { return same(HeapTester::percolatedDown({150, 80, 40, 20, 10, 50, 110, 100, 30, 90, 60, 70, 120, 140, 130}, 2), "150 10 40 20 60 50 110 100 30 90 80 70 120 140 130"); });
	test("a leaf: nothing moves", [] { return same(HeapTester::percolatedDown({10, 20, 15, 30, 40}, 5), "10 20 15 30 40"); });
	test("two equal children: the left one goes up", [] { return same(HeapTester::percolatedDown({5, 3, 3}, 1), "3 5 3"); });

	group("deleteMin");
	test("the example of the slides", [] { return same(HeapTester::deletedMin({13, 14, 16, 19, 21, 19, 68, 65, 26, 32, 31}), "14 19 16 26 21 19 68 65 31 32"); });
	test("the only element", [] { return same(HeapTester::deletedMin({7}), "(empty)"); });
	test("two elements", [] { return same(HeapTester::deletedMin({3, 8}), "8"); });
	test("the path ends at a node with one child", [] { return same(HeapTester::deletedMin({1, 2, 3, 4, 5}), "2 4 3 5"); });
	test("until empty: the values leave in order", [] { return same(HeapTester::drained({10, 20, 40, 30, 60, 50, 110, 100, 150, 90, 80, 70, 120, 140, 130}), "10 20 30 40 50 60 70 80 90 100 110 120 130 140 150"); });
	test("empty heap: underflow_error", [] { return same(HeapTester::deletedMin({}), "underflow_error"); });

	group("buildHeap");
	test("the example of the slides: 15 values", [] { return same(HeapTester::built({150, 80, 40, 30, 10, 70, 110, 100, 20, 90, 60, 50, 120, 140, 130}), "10 20 40 30 60 50 110 100 150 90 80 70 120 140 130"); });
	test("six values", [] { return same(HeapTester::built({8, 5, 17, 19, 21, 28}), "5 8 17 19 21 28"); });
	test("already a heap: nothing moves", [] { return same(HeapTester::built({1, 2, 3, 4, 5, 6, 7}), "1 2 3 4 5 6 7"); });
	test("in decreasing order", [] { return same(HeapTester::built({7, 6, 5, 4, 3, 2, 1}), "1 3 2 4 6 7 5"); });
	test("negative values", [] { return same(HeapTester::built({0, -3, 7, -8, 2, -1}), "-8 -3 -1 0 2 7"); });
	test("four values: a node with one child", [] { return same(HeapTester::built({8, 5, 17, 19}), "5 8 17 19"); });

	closeGroup();
	cout << "\nSummary" << endl;
	for (const string &line : summary) {
		cout << line << endl;
	}
	cout << "\n" << totalPassed << " of " << totalRun << " tests passed" << endl;
	return totalPassed == totalRun ? 0 : 1;
}

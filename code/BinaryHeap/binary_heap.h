/*
 * Binary heap of ints: a min-heap stored in an array, with cell 0 unused. The root is array[1], the
 * children of cell i are 2i and 2i + 1, and its parent is i / 2. Values may repeat.
 * Complete the methods marked with TODO in this order: findMin, insert and percolateDown, then
 * deleteMin and buildHeap. deleteMin and buildHeap use percolateDown.
 * The constructors, isEmpty, size and print are already written. Do not change the rest of the class.
 *
 * Student ID:
 * Date:
 */

#ifndef BINARY_HEAP_H
#define BINARY_HEAP_H

#include <iostream>
#include <stdexcept>
#include <vector>
using namespace std;

class BinaryHeap {
public:
	// An empty heap with room for `capacity` elements (it grows when it is full).
	explicit BinaryHeap(int capacity = 100) : currentSize{0}, array(capacity + 1) {}

	// A heap with the values of items, in any order: copies them into cells 1 to N, then calls buildHeap.
	explicit BinaryHeap(const vector<int> &items) : currentSize{int(items.size())}, array(items.size() + 10) {
		for (int i = 0; i < currentSize; ++i) {
			array[i + 1] = items[i];
		}
		buildHeap();
	}

	bool isEmpty() const { return currentSize == 0; }

	int size() const { return currentSize; }

	// Returns the smallest element without removing it. It is always in array[1].
	// If the heap is empty, throws underflow_error.
	const int &findMin() const {
		// TODO
		return array[0];
	}

	// Inserts x (percolate up). If the array is full, first double its size with array.resize.
	// The new element starts in the next free cell, currentSize + 1, and goes up while it is smaller
	// than its parent. Stop at the root: cell 1 has no parent.
	void insert(int x) {
		// TODO
	}

	// Removes the smallest element. If the heap is empty, throws underflow_error.
	// The last element moves to the root, the heap has one element less, and percolateDown(1) puts the
	// new root in its place.
	void deleteMin() {
		// TODO
	}

	// Prints cells 1 to currentSize, separated by spaces, and ends the line.
	void print() const {
		for (int i = 1; i <= currentSize; ++i) {
			cout << array[i] << " ";
		}
		cout << "\n";
	}

private:
	int currentSize;     // number of elements
	vector<int> array;   // the heap, in cells 1 to currentSize; cell 0 is not used

	// The tests call the private methods one by one.
	friend struct HeapTester;

	// Puts the heap order back in cells 1 to currentSize, whatever their order (percolate down from the
	// last parent, cell currentSize / 2, up to the root). The leaves are already heaps.
	void buildHeap() {
		// TODO
	}

	// Moves the element of cell `hole` down (percolate down): while it has children, compare it with the
	// smaller one, and if that child is smaller, the child goes up one level and the element goes down.
	// Careful: when currentSize is even, one node has only a left child. Check that the right child
	// exists (its cell is <= currentSize) before you read it.
	void percolateDown(int hole) {
		// TODO
	}
};

#endif

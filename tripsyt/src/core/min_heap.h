#pragma once

#include "my_vector.h"

/**
 * 最小堆模板类（优先队列）
 * T 需要支持 < 比较
 * 用于 Dijkstra 算法等需要优先队列的场景
 */
template <typename T>
class MinHeap {
private:
    MyVector<T> heap_;  // 用动态数组存储堆

    // 获取父节点索引
    int parent(int i) const {
        return (i - 1) / 2;
    }

    // 获取左子节点索引
    int leftChild(int i) const {
        return 2 * i + 1;
    }

    // 获取右子节点索引
    int rightChild(int i) const {
        return 2 * i + 2;
    }

    // 上浮操作：将索引i的元素向上调整
    void siftUp(int i) {
        while (i > 0 && heap_[parent(i)] > heap_[i]) {
            T temp = heap_[parent(i)];
            heap_[parent(i)] = heap_[i];
            heap_[i] = temp;
            i = parent(i);
        }
    }

    // 下沉操作：将索引i的元素向下调整
    void siftDown(int i) {
        int minIndex = i;
        int n = heap_.size();

        int l = leftChild(i);
        if (l < n && heap_[l] < heap_[minIndex]) {
            minIndex = l;
        }

        int r = rightChild(i);
        if (r < n && heap_[r] < heap_[minIndex]) {
            minIndex = r;
        }

        if (i != minIndex) {
            T temp = heap_[i];
            heap_[i] = heap_[minIndex];
            heap_[minIndex] = temp;
            siftDown(minIndex);
        }
    }

public:
    // 默认构造函数
    MinHeap() {}

    // 插入元素
    void push(const T& value) {
        heap_.push_back(value);
        siftUp(heap_.size() - 1);
    }

    // 弹出堆顶元素
    void pop() {
        if (heap_.empty()) return;
        heap_[0] = heap_[heap_.size() - 1];
        heap_.pop_back();
        if (!heap_.empty()) {
            siftDown(0);
        }
    }

    // 获取堆顶元素
    T top() const {
        return heap_[0];
    }

    // 堆大小
    int size() const {
        return heap_.size();
    }

    // 是否为空
    bool empty() const {
        return heap_.empty();
    }

    // 减小键值：查找并减小指定元素的值，然后调整堆
    // 注意：此方法通过遍历查找元素，时间复杂度 O(n)
    // 对于 Dijkstra 算法，通常配合外部索引使用
    void decreaseKey(const T& oldVal, const T& newVal) {
        // 查找旧值的位置
        for (int i = 0; i < heap_.size(); ++i) {
            if (heap_[i] == oldVal) {
                heap_[i] = newVal;
                siftUp(i);
                return;
            }
        }
    }

    // 通过索引减小键值（更高效，O(log n)）
    // 调用者需要知道元素在堆中的索引
    void decreaseKeyAt(int index, const T& newVal) {
        if (index < 0 || index >= heap_.size()) return;
        heap_[index] = newVal;
        siftUp(index);
    }

    // 清空堆
    void clear() {
        heap_.clear();
    }
};

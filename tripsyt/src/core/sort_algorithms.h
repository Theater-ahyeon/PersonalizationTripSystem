#pragma once

#include "my_vector.h"

/**
 * 排序算法集合
 * 所有排序接受自定义比较函数
 * 比较函数：返回 true 表示 a 应排在 b 前面
 */

// ==================== 快速排序 ====================

namespace internal {

// 快速排序的分区操作
template <typename T>
int partition(MyVector<T>& arr, int low, int high, bool (*cmp)(const T&, const T&)) {
    T pivot = arr[high]; // 选择最后一个元素作为基准
    int i = low - 1;
    for (int j = low; j < high; ++j) {
        if (cmp(arr[j], pivot)) {
            ++i;
            // 交换 arr[i] 和 arr[j]
            T temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    // 交换 arr[i+1] 和 arr[high]
    T temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return i + 1;
}

// 快速排序递归实现
template <typename T>
void quickSortHelper(MyVector<T>& arr, int low, int high, bool (*cmp)(const T&, const T&)) {
    if (low < high) {
        int pi = partition(arr, low, high, cmp);
        quickSortHelper(arr, low, pi - 1, cmp);
        quickSortHelper(arr, pi + 1, high, cmp);
    }
}

} // namespace internal

/**
 * 快速排序
 * @param arr 待排序数组
 * @param cmp 比较函数，cmp(a,b)=true 表示 a 排在 b 前面
 */
template <typename T>
void quickSort(MyVector<T>& arr, bool (*cmp)(const T&, const T&)) {
    if (arr.size() <= 1) return;
    internal::quickSortHelper(arr, 0, arr.size() - 1, cmp);
}

// ==================== 归并排序 ====================

namespace internal {

// 合并两个有序子数组
template <typename T>
void merge(MyVector<T>& arr, int left, int mid, int right, bool (*cmp)(const T&, const T&)) {
    int n1 = mid - left + 1;
    int n2 = right - mid;

    // 创建临时数组
    T* L = new T[n1];
    T* R = new T[n2];

    for (int i = 0; i < n1; ++i) L[i] = arr[left + i];
    for (int j = 0; j < n2; ++j) R[j] = arr[mid + 1 + j];

    int i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        if (cmp(L[i], R[j]) || (!cmp(R[j], L[i]) && !cmp(L[i], R[j]))) {
            arr[k] = L[i];
            ++i;
        } else {
            arr[k] = R[j];
            ++j;
        }
        ++k;
    }

    while (i < n1) {
        arr[k] = L[i];
        ++i;
        ++k;
    }

    while (j < n2) {
        arr[k] = R[j];
        ++j;
        ++k;
    }

    delete[] L;
    delete[] R;
}

// 归并排序递归实现
template <typename T>
void mergeSortHelper(MyVector<T>& arr, int left, int right, bool (*cmp)(const T&, const T&)) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        mergeSortHelper(arr, left, mid, cmp);
        mergeSortHelper(arr, mid + 1, right, cmp);
        merge(arr, left, mid, right, cmp);
    }
}

} // namespace internal

/**
 * 归并排序
 * @param arr 待排序数组
 * @param cmp 比较函数，cmp(a,b)=true 表示 a 排在 b 前面
 */
template <typename T>
void mergeSort(MyVector<T>& arr, bool (*cmp)(const T&, const T&)) {
    if (arr.size() <= 1) return;
    internal::mergeSortHelper(arr, 0, arr.size() - 1, cmp);
}

// ==================== 部分排序（Top-K） ====================

namespace internal {

// 部分快速排序：只排前k个最小的元素
template <typename T>
void partialQuickSort(MyVector<T>& arr, int low, int high, int k,
                      bool (*cmp)(const T&, const T&)) {
    if (low < high) {
        int pi = partition(arr, low, high, cmp);

        // 对左半部分递归排序
        partialQuickSort(arr, low, pi - 1, k, cmp);

        // 只有当基准位置小于k时，才需要对右半部分排序
        if (pi < k - 1) {
            partialQuickSort(arr, pi + 1, high, k, cmp);
        }
    }
}

} // namespace internal

/**
 * 部分排序：只排前k个，不需要完全排序
 * 核心用途：top-10推荐等场景
 * @param arr 待排序数组
 * @param k 只排前k个
 * @param cmp 比较函数，cmp(a,b)=true 表示 a 排在 b 前面
 */
template <typename T>
void partialSort(MyVector<T>& arr, int k, bool (*cmp)(const T&, const T&)) {
    if (arr.size() <= 1 || k <= 0) return;
    if (k >= arr.size()) {
        // k大于数组长度，直接全排序
        quickSort(arr, cmp);
        return;
    }
    internal::partialQuickSort(arr, 0, arr.size() - 1, k, cmp);
}

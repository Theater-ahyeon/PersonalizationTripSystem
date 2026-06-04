#pragma once
#include <stdexcept>
#include <initializer_list>
#include <algorithm>

// 自定义动态数组（类似std::vector）
template <typename T>
class MyVector {
private:
    T* data_;          // 数据数组
    int size_;         // 当前元素数量
    int capacity_;     // 当前容量

    // 扩容
    void expand() {
        if (capacity_ == 0) {
            capacity_ = 4;
            data_ = new T[capacity_];
        } else {
            int newCap = capacity_ * 2;
            T* newData = new T[newCap];
            for (int i = 0; i < size_; ++i) {
                newData[i] = std::move(data_[i]);
            }
            delete[] data_;
            data_ = newData;
            capacity_ = newCap;
        }
    }

public:
    // 默认构造
    MyVector() : data_(nullptr), size_(0), capacity_(0) {}

    // 带初始容量构造
    MyVector(int cap) : data_(new T[cap]), size_(0), capacity_(cap) {}

    // 拷贝构造
    MyVector(const MyVector& other) : data_(new T[other.capacity_]), size_(other.size_), capacity_(other.capacity_) {
        for (int i = 0; i < size_; ++i) {
            data_[i] = other.data_[i];
        }
    }

    // 移动构造
    MyVector(MyVector&& other) noexcept : data_(other.data_), size_(other.size_), capacity_(other.capacity_) {
        other.data_ = nullptr;
        other.size_ = 0;
        other.capacity_ = 0;
    }

    // 初始化列表构造
    MyVector(std::initializer_list<T> init) : data_(new T[init.size()]), size_(0), capacity_(static_cast<int>(init.size())) {
        for (const auto& item : init) {
            data_[size_++] = item;
        }
    }

    // 析构
    ~MyVector() {
        delete[] data_;
    }

    // 赋值运算符
    MyVector& operator=(const MyVector& other) {
        if (this != &other) {
            delete[] data_;
            capacity_ = other.capacity_;
            size_ = other.size_;
            data_ = new T[capacity_];
            for (int i = 0; i < size_; ++i) {
                data_[i] = other.data_[i];
            }
        }
        return *this;
    }

    MyVector& operator=(MyVector&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            capacity_ = other.capacity_;
            other.data_ = nullptr;
            other.size_ = 0;
            other.capacity_ = 0;
        }
        return *this;
    }

    // 尾部添加元素
    void push_back(const T& val) {
        if (size_ == capacity_) expand();
        data_[size_++] = val;
    }

    // 尾部添加元素（移动语义）
    void push_back(T&& val) {
        if (size_ == capacity_) expand();
        data_[size_++] = std::move(val);
    }

    // 尾部删除
    void pop_back() {
        if (size_ > 0) --size_;
    }

    // 按索引访问
    T& operator[](int idx) {
        return data_[idx];
    }

    const T& operator[](int idx) const {
        return data_[idx];
    }

    // 获取元素数量
    int size() const { return size_; }

    // 获取容量
    int capacity() const { return capacity_; }

    // 判空
    bool empty() const { return size_ == 0; }

    // 调整容量
    void resize(int newCapacity) {
        T* newData = new T[newCapacity]();
        int copySize = (size_ < newCapacity) ? size_ : newCapacity;
        for (int i = 0; i < copySize; ++i) {
            newData[i] = std::move(data_[i]);
        }
        delete[] data_;
        data_ = newData;
        capacity_ = newCapacity;
        if (size_ > capacity_) size_ = capacity_;
    }

    // 清空
    void clear() { size_ = 0; }

    // 获取首元素
    T& front() { return data_[0]; }
    const T& front() const { return data_[0]; }

    // 获取尾元素
    T& back() { return data_[size_ - 1]; }
    const T& back() const { return data_[size_ - 1]; }

    // 获取原始指针
    T* data() { return data_; }
    const T* data() const { return data_; }

    // 在指定位置插入
    void insert(int idx, const T& val) {
        if (idx < 0 || idx > size_) return;
        if (size_ == capacity_) expand();
        for (int i = size_; i > idx; --i) {
            data_[i] = std::move(data_[i - 1]);
        }
        data_[idx] = val;
        ++size_;
    }

    // 删除指定位置元素
    void erase(int idx) {
        if (idx < 0 || idx >= size_) return;
        for (int i = idx; i < size_ - 1; ++i) {
            data_[i] = std::move(data_[i + 1]);
        }
        --size_;
    }

    // 查找元素（返回索引，未找到返回-1）
    int find(const T& val) const {
        for (int i = 0; i < size_; ++i) {
            if (data_[i] == val) return i;
        }
        return -1;
    }

    // 判断是否包含某元素
    bool contains(const T& val) const {
        return find(val) != -1;
    }

    // 迭代器支持
    T* begin() { return data_; }
    T* end() { return data_ + size_; }
    const T* begin() const { return data_; }
    const T* end() const { return data_ + size_; }
};

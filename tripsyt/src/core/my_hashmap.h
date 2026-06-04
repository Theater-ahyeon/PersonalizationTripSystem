#pragma once
#include <string>
#include <functional>

// 默认字符串哈希函数
struct DefaultStringHash {
    size_t operator()(const std::string& key) const {
        size_t hash = 5381;
        for (char c : key) {
            hash = ((hash << 5) + hash) + static_cast<size_t>(c);
        }
        return hash;
    }
};

// 默认整数哈希函数
struct DefaultIntHash {
    size_t operator()(int key) const {
        return static_cast<size_t>(key) * 2654435761u;
    }
};

// 自定义哈希表（类似std::unordered_map）
template <typename Key, typename Value, typename HashFunc = DefaultStringHash>
class MyHashMap {
private:
    // 哈希表节点
    struct Node {
        Key key;
        Value value;
        Node* next;
        Node(const Key& k, const Value& v) : key(k), value(v), next(nullptr) {}
    };

    Node** buckets_;      // 桶数组
    int bucketCount_;     // 桶数量
    int size_;            // 元素数量
    HashFunc hashFunc_;   // 哈希函数

    // 计算桶索引
    int bucketIndex(const Key& key) const {
        return static_cast<int>(hashFunc_(key) % static_cast<size_t>(bucketCount_));
    }

    // 扩容
    void rehash() {
        int oldCount = bucketCount_;
        Node** oldBuckets = buckets_;
        bucketCount_ = bucketCount_ * 2;
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
        }
        size_ = 0;
        for (int i = 0; i < oldCount; ++i) {
            Node* cur = oldBuckets[i];
            while (cur) {
                Node* next = cur->next;
                int idx = bucketIndex(cur->key);
                cur->next = buckets_[idx];
                buckets_[idx] = cur;
                ++size_;
                cur = next;
            }
        }
        delete[] oldBuckets;
    }

public:
    // 构造
    MyHashMap(int bucketCount = 64) : bucketCount_(bucketCount), size_(0) {
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
        }
    }

    // 拷贝构造
    MyHashMap(const MyHashMap& other) : bucketCount_(other.bucketCount_), size_(0), hashFunc_(other.hashFunc_) {
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
            Node* cur = other.buckets_[i];
            while (cur) {
                insert(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }

    // 析构
    ~MyHashMap() {
        clear();
        delete[] buckets_;
    }

    // 赋值运算符
    MyHashMap& operator=(const MyHashMap& other) {
        if (this != &other) {
            clear();
            delete[] buckets_;
            bucketCount_ = other.bucketCount_;
            size_ = 0;
            buckets_ = new Node * [bucketCount_];
            for (int i = 0; i < bucketCount_; ++i) {
                buckets_[i] = nullptr;
                Node* cur = other.buckets_[i];
                while (cur) {
                    insert(cur->key, cur->value);
                    cur = cur->next;
                }
            }
        }
        return *this;
    }

    // 插入/更新键值对
    void insert(const Key& key, const Value& value) {
        if (size_ >= bucketCount_ * 2) rehash();
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) {
                cur->value = value; // 更新
                return;
            }
            cur = cur->next;
        }
        // 新插入
        Node* node = new Node(key, value);
        node->next = buckets_[idx];
        buckets_[idx] = node;
        ++size_;
    }

    // 获取值（不存在则插入默认值）
    Value& operator[](const Key& key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return cur->value;
            cur = cur->next;
        }
        // 插入默认值
        if (size_ >= bucketCount_ * 2) {
            rehash();
            idx = bucketIndex(key);
        }
        Node* node = new Node(key, Value());
        node->next = buckets_[idx];
        buckets_[idx] = node;
        ++size_;
        return buckets_[idx]->value;
    }

    // 查找（返回指针，未找到返回nullptr）
    Value* find(const Key& key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    const Value* find(const Key& key) const {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    // 删除
    void erase(const Key& key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        Node* prev = nullptr;
        while (cur) {
            if (cur->key == key) {
                if (prev) prev->next = cur->next;
                else buckets_[idx] = cur->next;
                delete cur;
                --size_;
                return;
            }
            prev = cur;
            cur = cur->next;
        }
    }

    // 判断是否包含key
    bool contains(const Key& key) const {
        return find(key) != nullptr;
    }

    // 元素数量
    int size() const { return size_; }

    // 判空
    bool empty() const { return size_ == 0; }

    // 清空
    void clear() {
        for (int i = 0; i < bucketCount_; ++i) {
            Node* cur = buckets_[i];
            while (cur) {
                Node* next = cur->next;
                delete cur;
                cur = next;
            }
            buckets_[i] = nullptr;
        }
        size_ = 0;
    }

    // 遍历所有键值对
    template <typename Func>
    void forEach(Func func) const {
        for (int i = 0; i < bucketCount_; ++i) {
            Node* cur = buckets_[i];
            while (cur) {
                func(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }
};

// 整数键特化版本
template <typename Value>
class MyHashMap<int, Value, DefaultIntHash> {
private:
    struct Node {
        int key;
        Value value;
        Node* next;
        Node(int k, const Value& v) : key(k), value(v), next(nullptr) {}
    };

    Node** buckets_;
    int bucketCount_;
    int size_;
    DefaultIntHash hashFunc_;

    int bucketIndex(int key) const {
        return static_cast<int>(hashFunc_(key) % static_cast<size_t>(bucketCount_));
    }

    void rehash() {
        int oldCount = bucketCount_;
        Node** oldBuckets = buckets_;
        bucketCount_ = bucketCount_ * 2;
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
        }
        size_ = 0;
        for (int i = 0; i < oldCount; ++i) {
            Node* cur = oldBuckets[i];
            while (cur) {
                Node* next = cur->next;
                int idx = bucketIndex(cur->key);
                cur->next = buckets_[idx];
                buckets_[idx] = cur;
                ++size_;
                cur = next;
            }
        }
        delete[] oldBuckets;
    }

public:
    MyHashMap(int bucketCount = 64) : bucketCount_(bucketCount), size_(0) {
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
        }
    }

    MyHashMap(const MyHashMap& other) : bucketCount_(other.bucketCount_), size_(0) {
        buckets_ = new Node * [bucketCount_];
        for (int i = 0; i < bucketCount_; ++i) {
            buckets_[i] = nullptr;
            Node* cur = other.buckets_[i];
            while (cur) {
                insert(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }

    ~MyHashMap() {
        clear();
        delete[] buckets_;
    }

    MyHashMap& operator=(const MyHashMap& other) {
        if (this != &other) {
            clear();
            delete[] buckets_;
            bucketCount_ = other.bucketCount_;
            size_ = 0;
            buckets_ = new Node * [bucketCount_];
            for (int i = 0; i < bucketCount_; ++i) {
                buckets_[i] = nullptr;
                Node* cur = other.buckets_[i];
                while (cur) {
                    insert(cur->key, cur->value);
                    cur = cur->next;
                }
            }
        }
        return *this;
    }

    void insert(int key, const Value& value) {
        if (size_ >= bucketCount_ * 2) rehash();
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) {
                cur->value = value;
                return;
            }
            cur = cur->next;
        }
        Node* node = new Node(key, value);
        node->next = buckets_[idx];
        buckets_[idx] = node;
        ++size_;
    }

    Value& operator[](int key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return cur->value;
            cur = cur->next;
        }
        if (size_ >= bucketCount_ * 2) {
            rehash();
            idx = bucketIndex(key);
        }
        Node* node = new Node(key, Value());
        node->next = buckets_[idx];
        buckets_[idx] = node;
        ++size_;
        return buckets_[idx]->value;
    }

    Value* find(int key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    const Value* find(int key) const {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    void erase(int key) {
        int idx = bucketIndex(key);
        Node* cur = buckets_[idx];
        Node* prev = nullptr;
        while (cur) {
            if (cur->key == key) {
                if (prev) prev->next = cur->next;
                else buckets_[idx] = cur->next;
                delete cur;
                --size_;
                return;
            }
            prev = cur;
            cur = cur->next;
        }
    }

    bool contains(int key) const {
        return find(key) != nullptr;
    }

    int size() const { return size_; }
    bool empty() const { return size_ == 0; }

    void clear() {
        for (int i = 0; i < bucketCount_; ++i) {
            Node* cur = buckets_[i];
            while (cur) {
                Node* next = cur->next;
                delete cur;
                cur = next;
            }
            buckets_[i] = nullptr;
        }
        size_ = 0;
    }

    template <typename Func>
    void forEach(Func func) const {
        for (int i = 0; i < bucketCount_; ++i) {
            Node* cur = buckets_[i];
            while (cur) {
                func(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }
};

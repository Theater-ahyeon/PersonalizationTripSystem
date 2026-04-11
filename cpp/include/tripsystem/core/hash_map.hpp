#pragma once

#include <functional>
#include <utility>
#include <vector>

namespace tripsystem::core {

template <typename K, typename V, typename Hasher = std::hash<K>>
class HashMap {
public:
    explicit HashMap(std::size_t bucket_count = 17)
        : buckets_(bucket_count), size_(0) {}

    void clear() {
        buckets_.assign(17, {});
        size_ = 0;
    }

    std::size_t size() const {
        return size_;
    }

    bool empty() const {
        return size_ == 0;
    }

    void insert_or_assign(const K& key, const V& value) {
        maybe_rehash();
        auto& bucket = buckets_[bucket_index(key)];
        for (auto& entry : bucket) {
            if (entry.first == key) {
                entry.second = value;
                return;
            }
        }
        bucket.emplace_back(key, value);
        ++size_;
    }

    bool contains(const K& key) const {
        return find(key) != nullptr;
    }

    V* find(const K& key) {
        auto& bucket = buckets_[bucket_index(key)];
        for (auto& entry : bucket) {
            if (entry.first == key) {
                return &entry.second;
            }
        }
        return nullptr;
    }

    const V* find(const K& key) const {
        const auto& bucket = buckets_[bucket_index(key)];
        for (const auto& entry : bucket) {
            if (entry.first == key) {
                return &entry.second;
            }
        }
        return nullptr;
    }

private:
    std::size_t bucket_index(const K& key) const {
        return hasher_(key) % buckets_.size();
    }

    void maybe_rehash() {
        if ((size_ + 1.0) / static_cast<double>(buckets_.size()) <= 0.75) {
            return;
        }
        std::vector<std::vector<std::pair<K, V>>> new_buckets(buckets_.size() * 2 + 1);
        for (auto& bucket : buckets_) {
            for (auto& entry : bucket) {
                auto index = hasher_(entry.first) % new_buckets.size();
                new_buckets[index].push_back(std::move(entry));
            }
        }
        buckets_ = std::move(new_buckets);
    }

    std::vector<std::vector<std::pair<K, V>>> buckets_;
    std::size_t size_;
    Hasher hasher_;
};

}  // namespace tripsystem::core


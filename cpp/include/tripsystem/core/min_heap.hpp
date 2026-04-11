#pragma once

#include <stdexcept>
#include <utility>
#include <vector>

namespace tripsystem::core {

template <typename T, typename Compare>
class MinHeap {
public:
    explicit MinHeap(Compare compare) : compare_(compare) {}

    bool empty() const {
        return data_.empty();
    }

    std::size_t size() const {
        return data_.size();
    }

    const T& top() const {
        if (data_.empty()) {
            throw std::runtime_error("heap is empty");
        }
        return data_.front();
    }

    void push(const T& value) {
        data_.push_back(value);
        sift_up(data_.size() - 1);
    }

    void push(T&& value) {
        data_.push_back(std::move(value));
        sift_up(data_.size() - 1);
    }

    void pop() {
        if (data_.empty()) {
            throw std::runtime_error("heap is empty");
        }
        std::swap(data_.front(), data_.back());
        data_.pop_back();
        if (!data_.empty()) {
            sift_down(0);
        }
    }

private:
    bool before(const T& lhs, const T& rhs) const {
        return compare_(lhs, rhs);
    }

    void sift_up(std::size_t index) {
        while (index > 0) {
            const auto parent = (index - 1) / 2;
            if (!before(data_[index], data_[parent])) {
                break;
            }
            std::swap(data_[index], data_[parent]);
            index = parent;
        }
    }

    void sift_down(std::size_t index) {
        while (true) {
            auto smallest = index;
            const auto left = index * 2 + 1;
            const auto right = index * 2 + 2;

            if (left < data_.size() && before(data_[left], data_[smallest])) {
                smallest = left;
            }
            if (right < data_.size() && before(data_[right], data_[smallest])) {
                smallest = right;
            }
            if (smallest == index) {
                break;
            }
            std::swap(data_[index], data_[smallest]);
            index = smallest;
        }
    }

    std::vector<T> data_;
    Compare compare_;
};

}  // namespace tripsystem::core


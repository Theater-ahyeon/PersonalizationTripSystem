#pragma once

#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace tripsystem::core {

class Trie {
public:
    Trie() : root_(std::make_unique<Node>()) {}

    void clear() {
        root_ = std::make_unique<Node>();
    }

    void insert(const std::string& word) {
        Node* current = root_.get();
        for (char ch : word) {
            current = ensure_child(*current, ch);
        }
        current->terminal = true;
    }

    std::vector<std::string> autocomplete(const std::string& prefix, std::size_t limit) const {
        const Node* current = root_.get();
        for (char ch : prefix) {
            current = find_child(*current, ch);
            if (current == nullptr) {
                return {};
            }
        }

        std::vector<std::string> results;
        std::string path = prefix;
        collect(*current, path, limit, results);
        return results;
    }

private:
    struct Node {
        bool terminal{false};
        std::vector<std::pair<char, std::unique_ptr<Node>>> children;
    };

    static Node* ensure_child(Node& node, char ch) {
        for (auto& [key, child] : node.children) {
            if (key == ch) {
                return child.get();
            }
        }
        node.children.emplace_back(ch, std::make_unique<Node>());
        return node.children.back().second.get();
    }

    static const Node* find_child(const Node& node, char ch) {
        for (const auto& [key, child] : node.children) {
            if (key == ch) {
                return child.get();
            }
        }
        return nullptr;
    }

    static void collect(const Node& node, std::string& path, std::size_t limit, std::vector<std::string>& out) {
        if (out.size() >= limit) {
            return;
        }
        if (node.terminal) {
            out.push_back(path);
        }

        std::vector<std::pair<char, const Node*>> ordered;
        ordered.reserve(node.children.size());
        for (const auto& [key, child] : node.children) {
            ordered.emplace_back(key, child.get());
        }
        std::sort(ordered.begin(), ordered.end(),
                  [](const auto& lhs, const auto& rhs) { return lhs.first < rhs.first; });

        for (const auto& [ch, child] : ordered) {
            path.push_back(ch);
            collect(*child, path, limit, out);
            path.pop_back();
            if (out.size() >= limit) {
                return;
            }
        }
    }

    std::unique_ptr<Node> root_;
};

}  // namespace tripsystem::core


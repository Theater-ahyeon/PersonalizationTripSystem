"""
Trie (prefix tree) for efficient prefix and fuzzy text search.

Stores words with associated data references. Supports exact lookup,
prefix-based autocomplete, and fuzzy search via Levenshtein edit distance
with DFS traversal. Used for scenic spot, food, and diary title search.

Contract: FND-004
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


class TrieNode:
    """A node in the Trie.

    Each node maps characters to child nodes and may hold a data reference
    when the path to this node completes a stored word.

    Attributes:
        children: Dict mapping characters to child TrieNodes.
        data_ref: The stored data for a word ending at this node, or None.
        is_end: True if this node marks the end of a stored word.
    """

    __slots__ = ("children", "data_ref", "is_end")

    def __init__(self) -> None:
        self.children: Dict[str, "TrieNode"] = {}
        self.data_ref: Any = None
        self.is_end: bool = False


class Trie:
    """A prefix tree (trie) for word storage and retrieval.

    Supports exact search, prefix autocomplete with a configurable result
    limit, and fuzzy search based on Levenshtein (edit) distance with DFS.

    Usage::

        trie = Trie()
        trie.insert("故宫", {"id": 1, "name": "故宫"})
        results = trie.prefix_search("故", limit=10)
        fuzzy = trie.fuzzy_search("古宫", max_distance=1)
    """

    def __init__(self) -> None:
        """Initialize an empty trie."""
        self.root: TrieNode = TrieNode()
        self._word_count: int = 0

    # ------------------------------------------------------------------
    # Insert
    # ------------------------------------------------------------------

    def insert(self, word: str, data_ref: Any = None) -> None:
        """Insert a word and its associated data into the trie.

        If the word already exists, its data reference is updated.

        Args:
            word: The string key to insert.
            data_ref: Arbitrary data to associate with this word.
        """
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        if not node.is_end:
            self._word_count += 1
        node.is_end = True
        node.data_ref = data_ref

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(self, word: str) -> Optional[Any]:
        """Perform an exact-match lookup.

        Args:
            word: The exact string to find.

        Returns:
            The data reference stored with the word, or None if not found.
        """
        node = self._traverse(word)
        if node is None or not node.is_end:
            return None
        return node.data_ref

    # ------------------------------------------------------------------
    # Prefix search
    # ------------------------------------------------------------------

    def prefix_search(self, prefix: str, limit: int = 20) -> List[Any]:
        """Return data refs for all words that start with *prefix*.

        Performs a DFS from the prefix node to collect matching entries.

        Args:
            prefix: The string prefix to match.
            limit: Maximum number of results to return. Default 20.

        Returns:
            A list of up to *limit* data references for words with the
            given prefix.
        """
        node = self._traverse(prefix)
        if node is None:
            return []

        results: List[Any] = []
        self._collect(node, results, limit)
        return results

    # ------------------------------------------------------------------
    # Fuzzy search (Levenshtein + DFS)
    # ------------------------------------------------------------------

    def fuzzy_search(
        self, pattern: str, max_distance: int = 2
    ) -> List[Tuple[str, Any, int]]:
        """Search for words within *max_distance* edit operations of *pattern*.

        Uses a Levenshtein-automaton-like DFS through the trie. Each result
        includes the matched word, its data ref, and the actual edit distance.

        Args:
            pattern: The target string to match against.
            max_distance: Maximum allowed edit distance (0 = exact only).

        Returns:
            A list of (matched_word, data_ref, distance) tuples, sorted by
            ascending distance.
        """
        if max_distance < 0:
            return []

        # DP row for the empty-string prefix
        initial_row = list(range(len(pattern) + 1))
        results: List[Tuple[str, Any, int]] = []

        self._fuzzy_dfs(
            node=self.root,
            pattern=pattern,
            current_row=initial_row,
            prefix_chars=[],
            results=results,
            max_distance=max_distance,
        )

        # Sort by ascending edit distance
        results.sort(key=lambda r: r[2])
        return results

    def _fuzzy_dfs(
        self,
        node: TrieNode,
        pattern: str,
        current_row: List[int],
        prefix_chars: List[str],
        results: List[Tuple[str, Any, int]],
        max_distance: int,
    ) -> None:
        """Recursive DFS for fuzzy matching."""
        # If the last entry in the row is within max_distance and we
        # are at a word-ending node, record the match.
        if current_row[-1] <= max_distance and node.is_end:
            word = "".join(prefix_chars)
            results.append((word, node.data_ref, current_row[-1]))

        # If every entry in the row exceeds max_distance, prune.
        if min(current_row) > max_distance:
            return

        for ch, child in node.children.items():
            self._fuzzy_dfs(
                node=child,
                pattern=pattern,
                current_row=self._next_row(current_row, pattern, ch),
                prefix_chars=prefix_chars + [ch],
                results=results,
                max_distance=max_distance,
            )

    @staticmethod
    def _next_row(
        prev_row: List[int], pattern: str, ch: str
    ) -> List[int]:
        """Compute the next DP row for fuzzy-DFS given character *ch*."""
        n = len(pattern)
        next_row = [0] * (n + 1)
        next_row[0] = prev_row[0] + 1  # deletion cost

        for j in range(1, n + 1):
            if pattern[j - 1] == ch:
                next_row[j] = prev_row[j - 1]  # match — no cost
            else:
                next_row[j] = 1 + min(
                    prev_row[j],      # deletion
                    next_row[j - 1],  # insertion
                    prev_row[j - 1],  # substitution
                )

        return next_row

    # ------------------------------------------------------------------
    # Edit distance (standalone)
    # ------------------------------------------------------------------

    @staticmethod
    def _edit_distance(s1: str, s2: str) -> int:
        """Compute Levenshtein distance between two strings.

        Args:
            s1: First string.
            s2: Second string.

        Returns:
            Minimum number of single-character edits (insert, delete,
            substitute) required to transform s1 into s2.
        """
        if len(s1) < len(s2):
            s1, s2 = s2, s1

        n1, n2 = len(s1), len(s2)
        # Use two rows to save memory
        prev = list(range(n2 + 1))

        for i in range(1, n1 + 1):
            curr = [i] + [0] * n2
            for j in range(1, n2 + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                curr[j] = min(
                    prev[j] + 1,        # deletion
                    curr[j - 1] + 1,    # insertion
                    prev[j - 1] + cost,  # substitution
                )
            prev = curr

        return prev[-1]

    # ------------------------------------------------------------------
    # Deletion
    # ------------------------------------------------------------------

    def delete(self, word: str) -> bool:
        """Remove a word from the trie.

        Args:
            word: The word to remove.

        Returns:
            True if the word was found and deleted, False otherwise.
        """
        found, _ = self._delete_recursive(self.root, word, 0)
        if found:
            self._word_count -= 1
        return found

    def _delete_recursive(
        self, node: TrieNode, word: str, depth: int
    ) -> Tuple[bool, bool]:
        """Recursively remove a word, cleaning up unused nodes.

        Returns:
            (word_found, should_delete_this_child) — the first indicates
            whether the word existed; the second indicates whether the
            caller should remove this child node from its children dict.
        """
        if depth == len(word):
            if not node.is_end:
                return (False, False)
            node.is_end = False
            node.data_ref = None
            # Node can be removed if it has no children
            can_delete = len(node.children) == 0
            return (True, can_delete)

        ch = word[depth]
        if ch not in node.children:
            return (False, False)

        child = node.children[ch]
        found, should_delete_child = self._delete_recursive(
            child, word, depth + 1
        )

        if should_delete_child:
            del node.children[ch]
            # This node can also be removed if it's not an end and childless
            return (found, not node.is_end and len(node.children) == 0)

        return (found, False)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def word_count(self) -> int:
        """Return the number of words stored in the trie.

        Returns:
            Count of distinct inserted words.
        """
        return self._word_count

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _traverse(self, prefix: str) -> Optional[TrieNode]:
        """Walk the trie following *prefix*; return the resulting node or None."""
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def _collect(
        self, node: TrieNode, results: List[Any], limit: int
    ) -> None:
        """DFS collection of data refs from *node* downward."""
        if len(results) >= limit:
            return
        if node.is_end:
            results.append(node.data_ref)
        for child in node.children.values():
            self._collect(child, results, limit)
            if len(results) >= limit:
                return

    # ------------------------------------------------------------------
    # Magic methods
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return self._word_count

    def __contains__(self, word: str) -> bool:
        return self.search(word) is not None

    def __repr__(self) -> str:
        return f"Trie(words={self._word_count})"

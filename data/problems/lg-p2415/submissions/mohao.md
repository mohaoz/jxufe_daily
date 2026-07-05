---
solution: true
---

**Hints 1**

对于给定的 $n$，枚举子集共有 $2^n$ 种选法。

**Hints 2**

考虑直接暴力枚举所有子集求和，其时间复杂度是 $O(n\times 2^n)$，对于 $n=30$ 显然会超时。

**Hints 3**

考虑计算每一个元素对答案的贡献。

**Solution**

考虑第 $i$ 个元素，其能被 $2^{n-1}$ 种选法选中。那么每一个元素的权值就是 $2^{n-1}\times a_i$。

于是答案就是 $2^{n-1}\times\sum a$

**Code**

```py
s = list(map(int, input().split()))
n = len(s)
w = 1 << (n - 1)
print(sum(s) * w)
```
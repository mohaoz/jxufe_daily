---
record: https://atcoder.jp/contests/abc280/submissions/77223638
solution: true
---

**Code**

```cpp
void solve() {
    int n, p;
    cin >> n >> p;
    p = p * inv(100) % MOD;
    int q = (1 - p + MOD) % MOD;
    vector<int> dp(n + 10);
    for (int i = n - 1; i >= 0; i--) {
        dp[i] = (1 + dp[i + 2] * p % MOD + dp[i + 1] * q % MOD) % MOD;
    }
    cout << dp[0] % MOD << "\n";
}
```
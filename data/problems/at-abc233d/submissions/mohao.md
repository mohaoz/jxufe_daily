---
record: https://atcoder.jp/contests/abc233/submissions/77223380
solution: true
---

**Code**

```cpp
void solve() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    map<int, int> pre;
    pre[0] = 1;
    int cur = 0, ans = 0;
    for (int i = 0; i < n; i++) {
        cur += a[i];
        if (pre.contains(cur - k)) {
            ans += pre[cur - k];
        }
        pre[cur]++;
    }
    cout << ans << "\n";
}
```
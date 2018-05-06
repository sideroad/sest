# Image snapshot testing

```
npm i -g sest@latest

sest
# proxy server
#     -p <value>
# browser height (default: 800)
#     -h <value>
# browser width (default: 1280)
#     -w <value>
# cookie listed file path
#     -c <value>
# threshold percentage (default: 10)
#     -t <value>
# dist directory path (default: snapshots)
#     -d <value>
# URL listed file path
#     -f <value> (required)

echo "sideroad,http://sideroad.secret.jp," > test.csv
echo "Google,https://google.com," >> test.csv
echo "Yahoo,https://www.yahoo.com/," >> test.csv

sest -f test.csv
```

## CSV format

* name ( name of the target page )
* URL ( URL of the target URL )
* click action ( specify css selector to execute click actions )

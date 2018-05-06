# Image snapshot testing

```
npm i -g sest@latest

sest
# user agent
#     -ua, --user-agent <value>
# proxy server
#     -p, --proxy <value>
# browser height (default: 800)
#     -h, --height <value>
# browser width (default: 1280)
#     -w, --width <value>
# cookie listed file path
#     -c, --cookie-file <value>
# threshold percentage (default: 10)
#     -t, --threshold <value>
# dist directory path (default: snapshots)
#     -d, --dist-dir <value>
# URL listed file path
#     -f, --file <value> (required)

echo "sideroad,http://sideroad.secret.jp," > test.csv
echo "Google,https://google.com," >> test.csv
echo "Yahoo,https://www.yahoo.com/," >> test.csv

sest -f test.csv
```

## CSV format

* name ( name of the target page )
* URL ( URL of the target URL )
* click action ( specify css selector to execute click actions )

### Create urls

```bash
$ python3 create_urls.py --maxzoom=19 --instance https://demo.nextgis.com --resid=3992
```

### Siege
```
# 50 concurrents / repeat 10 times (500 tiles)
$ siege --file urls.txt -b -c 50 -r 10

Transactions:		         500 hits
Availability:		      100.00 %
Elapsed time:		       37.74 secs
Data transferred:	        1.71 MB
Response time:		        2.53 secs
Transaction rate:	       13.25 trans/sec
Throughput:		        0.05 MB/sec
Concurrency:		       33.54
Successful transactions:         500
Failed transactions:	           0
Longest transaction:	       13.65
Shortest transaction:	        0.31
```
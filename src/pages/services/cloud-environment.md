# Fully-Hosted Cloud Environment

[← Other services](..)

Managing your own hardware and and scaling it up to meet demand is a tedious task. Meroton offers a fully hosted cloud environment which allows you to focus on your own code while we handle the system.

The environment is pay as you use with a free quota, this allows you to have the advantage of an arbitrary large build cluster even if you use it very sporadically and with 0 capital expenses.

If you feel like you would rather use your own hardware please read more about [self-hosted solutions](../self-hosted).

## Free Tier

The free tier allows you to use a remote build event stream and a remote cache. The free tier is limited to 10GB of caching and 100GB/month of throughput which gives you the ability to analyze your builds for bottlenecks and parts of your codebase that is rebuilt unnecessarily.

The free environment does not offer remote execution and is located in Frankfurt (AWS region eu-central-1), for performance reasons you should have as low latency as possible between the executors and the cache. For maximum performance we recommend running your build remotely in Frankfurt.

## Pricing

If the free tier is insufficient for your demands we offer the following extra features.

| Service            | Free Quota    | Additional Cost        |
| ------------------ | ------------- | ---------------------- |
| Cache Storage      | 10 GiB        | 1.49 USD / GiB / Month |
| Throughput         | 100 GiB/month | 0.19 USD / GiB         |
| Remote Execution   | None          | 0.005 USD / CPU minute |
| SSO Integration    |               | Contact us             |
| Region Replication |               | Contact us             |

Please contact sales@meroton.com for any inquiries.

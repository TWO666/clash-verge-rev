use clash_verge_logging::{Type, logging};

use super::use_lowercase;
use serde_yaml_ng::{self, Mapping, Value};

/// 这些字段的value是一个由用户自定义命名的字典
/// （key 是域名/规则集名字/节点池名字等，不是 mihomo 自身的 schema 字段名），
/// 语义上应该"整体替换"，而不是逐 key 深度合并。
const WHOLE_REPLACE_KEYS: &[&str] = &[
    "nameserver-policy", // dns.nameserver-policy: 域名 -> 服务器
    "hosts",             // dns.hosts / 顶层 hosts: 域名 -> IP
    "rule-providers",    // 规则集名字 -> 定义
    "proxy-providers",   // 节点池名字 -> 定义
    "sub-rules",         // 子规则集合名字 -> 规则列表
];

fn deep_merge(a: &mut Value, b: Value) {
    match (a, b) {
        (Value::Mapping(a_map), Value::Mapping(b_map)) => {
            for (key, value) in b_map {
                let whole_replace = key
                    .as_str()
                    .map(|k| WHOLE_REPLACE_KEYS.contains(&k))
                    .unwrap_or(false);

                if whole_replace {
                    a_map.insert(key, value); // 不递归，直接整体替换
                } else if let Some(existing) = a_map.get_mut(&key) {
                    deep_merge(existing, value);
                } else {
                    a_map.insert(key, value);
                }
            }
        }
        (a, b) => *a = b,
    }
}

pub fn use_merge(merge: &Mapping, config: Mapping) -> Mapping {
    let mut config = Value::from(config);
    let merge = use_lowercase(merge);

    deep_merge(&mut config, Value::from(merge));

    config.as_mapping().cloned().unwrap_or_else(|| {
        logging!(
            error,
            Type::Core,
            "Failed to convert merged config to mapping, using empty mapping"
        );
        Mapping::new()
    })
}

#[test]
fn test_merge() -> anyhow::Result<()> {
    let merge = r"
    prepend-rules:
      - prepend
      - 1123123
    append-rules:
      - append
    prepend-proxies:
      - 9999
    append-proxies:
      - 1111
    rules:
      - replace
    proxy-groups: 
      - 123781923810
    tun:
      enable: true
    dns:
      enable: true
  ";

    let config = r"
    rules:
      - aaaaa
    script1: test
  ";

    let merge = serde_yaml_ng::from_str::<Mapping>(merge)?;
    let config = serde_yaml_ng::from_str::<Mapping>(config)?;

    let _ = serde_yaml_ng::to_string(&use_merge(&merge, config))?;

    Ok(())
}

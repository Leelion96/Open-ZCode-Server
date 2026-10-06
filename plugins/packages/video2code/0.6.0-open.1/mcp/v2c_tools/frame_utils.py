"""帧分辨率档位 (media_resolution) + 缩放。

frames 模式下把视频帧 inline 给模型看时, 用一个 media_resolution 档位 (low/medium/
high) 控制每帧分辨率, 类比多模态 API 原生 video 的 media_resolution。档位按"每帧 token
预算"定义, 再用视觉模型的图片 token 公式反推目标像素面积:

    tokens ≈ (W * H) / 750     (PX_PER_TOKEN = 750)

档位 (tokens/帧 → 目标面积 px):
    low    ~70   → 52,500 px   (16:9 ≈ 305×172)
    medium ~256  → 192,000 px  (16:9 ≈ 584×329)   <- 默认
    high   ~786  → 589,500 px  (16:9 ≈ 1024×576)

只缩不放 (帧本就比预算小则原样返回), 保宽高比, 用 INTER_AREA 降采样。
clip_video (video.py) 和 read_file (files.py) 抽帧统一走这里, 避免两处分叉。
"""
from __future__ import annotations

MEDIA_RESOLUTION_TOKENS = {"low": 70, "medium": 256, "high": 786}  # tokens/帧
PX_PER_TOKEN = 750  # 视觉模型图片 token 公式: tokens ≈ (W * H) / 750
DEFAULT_TIER = "medium"


def budget_px(tier: str) -> int:
    """该档位的目标像素面积 (W*H 上限)。未知档位回落 medium。"""
    return MEDIA_RESOLUTION_TOKENS.get(tier, MEDIA_RESOLUTION_TOKENS[DEFAULT_TIER]) * PX_PER_TOKEN


def resize_frame(img, tier: str = DEFAULT_TIER):
    """按 media_resolution 档位等比降采样一帧 (cv2 BGR ndarray)。只缩不放。

    img: cv2.imread / VideoCapture.read 拿到的 ndarray (H,W,C)。
    返回缩放后的 ndarray (面积 <= budget_px(tier)); 本就够小则原样返回。
    """
    import cv2
    h, w = img.shape[:2]
    area = w * h
    budget = budget_px(tier)
    if area <= budget:
        return img
    s = (budget / area) ** 0.5
    nw = max(1, round(w * s))
    nh = max(1, round(h * s))
    return cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)

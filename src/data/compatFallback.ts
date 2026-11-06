// Static offline fallback matrix for Fiber Converter Compatible Tools
// Extracted from Novastar CompatibleTools bundle to guarantee compatibility checks
// continue working offline and survive website rebuilds.

import { CompatDevice, CompatRule } from "./catalog";

export const STATIC_COMPAT_CONVERTERS: CompatDevice[] = [
  {
    "id": "cvt10",
    "name": "CVT10-S/M CVT10 Pro-S/M",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "cvt4k",
    "name": "CVT4K-S/M",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "mctrl660pro",
    "name": "MCTRL660 Pro",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx400",
    "name": "VX400",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx600",
    "name": "VX600",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx1000",
    "name": "VX1000",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx400pro",
    "name": "VX400 Pro",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx600pro",
    "name": "VX600 Pro",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx1000pro",
    "name": "VX1000 Pro",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "vx2000pro",
    "name": "VX2000 Pro",
    "category": "converter",
    "brand": "NovaStar"
  },
  {
    "id": "novaprouhdjr",
    "name": "NovaPro UHD Jr",
    "category": "converter",
    "brand": "NovaStar"
  }
];

export const STATIC_COMPAT_CONTROLLERS: CompatDevice[] = [
  {
    "id": "mctrl660pro",
    "name": "MCTRL660 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mctrlr5",
    "name": "MCTRL R5",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mctrl4k",
    "name": "MCTRL 4K",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "ku20",
    "name": "KU20",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mx20",
    "name": "MX20",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mx30",
    "name": "MX30",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mx40pro",
    "name": "MX40 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "mx2000/6000pro",
    "name": "MX2000/6000 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx400",
    "name": "VX400",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx600",
    "name": "VX600",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx1000",
    "name": "VX1000",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx400pro",
    "name": "VX400 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx600pro",
    "name": "VX600 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx1000pro",
    "name": "VX1000 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "vx2000pro",
    "name": "VX2000 Pro",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "novaprouhdjr",
    "name": "NovaPro UHD Jr",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "h_16",
    "name": "H_16×J45+2×fiber sending card",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "h_4",
    "name": "H_4×fiber sending card",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "h_4e",
    "name": "H_4×fiber sending card (Enhanced)",
    "category": "controller",
    "brand": "NovaStar"
  },
  {
    "id": "tu4kpro",
    "name": "TU4K Pro",
    "category": "controller",
    "brand": "NovaStar"
  }
];

export const STATIC_COMPAT_RULES: Record<string, CompatRule> = {
  "cvt10_mctrl660pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "cvt10_mctrlr5": {
    "status": 1,
    "text": "1~8 Port"
  },
  "cvt10_mctrl4k": {
    "status": 1,
    "text": "1~8 Port or 9~16 Port"
  },
  "cvt10_ku20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "cvt10_mx20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "cvt10_mx30": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_mx40pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_mx2000/6000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "cvt10_vx600": {
    "status": 1,
    "text": "1~6 Port"
  },
  "cvt10_vx1000": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "cvt10_vx600pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "cvt10_vx1000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_vx2000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_novaprouhdjr": {
    "status": 1,
    "text": "1~8 Port"
  },
  "cvt10_h_16": {
    "status": 1,
    "text": "1~8 Port"
  },
  "cvt10_h_4": {
    "status": 1,
    "text": "1~8 Port"
  },
  "cvt10_h_4e": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt10_tu4kpro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "cvt4k_mctrl660pro": {
    "status": 1,
    "text": "1~6 Port or 9~14 Port"
  },
  "cvt4k_mctrlr5": {
    "status": 1,
    "text": "1~8 Port or 9~16 Port"
  },
  "cvt4k_mctrl4k": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "cvt4k_ku20": {
    "status": 1,
    "text": "1~6 Port or 9~14 Port"
  },
  "cvt4k_mx20": {
    "status": 1,
    "text": "1~6 Port or 9~14 Port"
  },
  "cvt4k_mx30": {
    "status": 1,
    "text": "1~10 Port or 11~16 Port"
  },
  "cvt4k_mx40pro": {
    "status": 1,
    "text": "1~10 Port and 11~16 Port"
  },
  "cvt4k_mx2000/6000pro": {
    "status": 1,
    "text": "1~10 Port and 11~16 Port"
  },
  "cvt4k_vx400": {
    "status": 1,
    "text": "1~4 Port or 11~14 Port"
  },
  "cvt4k_vx600": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "cvt4k_vx1000": {
    "status": 1,
    "text": "1~10 Port or 11~16 Port"
  },
  "cvt4k_vx400pro": {
    "status": 1,
    "text": "1~4 Port or 11~14 Port"
  },
  "cvt4k_vx600pro": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "cvt4k_vx1000pro": {
    "status": 1,
    "text": "1~10 Port or 11~16 Port"
  },
  "cvt4k_vx2000pro": {
    "status": 1,
    "text": "1~10 Port and 11~16 Port"
  },
  "cvt4k_novaprouhdjr": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "cvt4k_h_16": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "cvt4k_h_4": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "cvt4k_h_4e": {
    "status": 1,
    "text": "1~10 Port and 11~16 Port"
  },
  "cvt4k_tu4kpro": {
    "status": 1,
    "text": "1~10 Port and 11~16 Port"
  },
  "mctrl660pro_mctrl660pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "mctrl660pro_mctrlr5": {
    "status": 1,
    "text": "1~6 Port"
  },
  "mctrl660pro_mctrl4k": {
    "status": 1,
    "text": "1~6 Port"
  },
  "mctrl660pro_h_16": {
    "status": 1,
    "text": "1~6 Port"
  },
  "mctrl660pro_h_4": {
    "status": 1,
    "text": "1~6 Port"
  },
  "mctrl660pro_h_4e": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx400_ku20": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_mx20": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_mx30": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_mx40pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_mx2000/6000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx600": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx1000": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx600pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx1000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_vx2000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_h_4e": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400_tu4kpro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600_ku20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_mx20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_mx30": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_mx40pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_mx2000/6000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600_vx600": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_vx1000": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600_vx600pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_vx1000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_vx2000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_h_4e": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600_tu4kpro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000_ku20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000_mx20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000_mx30": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_mx40pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_mx2000/6000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx1000_vx600": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000_vx1000": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx1000_vx600pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000_vx1000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_vx2000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_h_4e": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000_tu4kpro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx400pro_ku20": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_mx20": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_mx30": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_mx40pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_mx2000/6000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx600": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx1000": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx600pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx1000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_vx2000pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_h_4e": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx400pro_tu4kpro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600pro_ku20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_mx20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_mx30": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_mx40pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_mx2000/6000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600pro_vx600": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_vx1000": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx600pro_vx600pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_vx1000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_vx2000pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_h_4e": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx600pro_tu4kpro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000pro_ku20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000pro_mx20": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000pro_mx30": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_mx40pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_mx2000/6000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_vx400": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx1000pro_vx600": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000pro_vx1000": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_vx400pro": {
    "status": 1,
    "text": "1~4 Port"
  },
  "vx1000pro_vx600pro": {
    "status": 1,
    "text": "1~6 Port"
  },
  "vx1000pro_vx1000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_vx2000pro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_h_4e": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx1000pro_tu4kpro": {
    "status": 1,
    "text": "1~10 Port"
  },
  "vx2000pro_ku20": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "vx2000pro_mx20": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "vx2000pro_mx30": {
    "status": 1,
    "text": "1~10 Port or 11~20 Port"
  },
  "vx2000pro_mx40pro": {
    "status": 1,
    "text": "1~10 Port and 11~20 Port"
  },
  "vx2000pro_mx2000/6000pro": {
    "status": 1,
    "text": "1~10 Port and 11~20 Port"
  },
  "vx2000pro_vx400": {
    "status": 1,
    "text": "1~4 Port or 11~14 Port"
  },
  "vx2000pro_vx600": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "vx2000pro_vx1000": {
    "status": 1,
    "text": "1~10 Port or 11~20 Port"
  },
  "vx2000pro_vx400pro": {
    "status": 1,
    "text": "1~4 Port or 11~14 Port"
  },
  "vx2000pro_vx600pro": {
    "status": 1,
    "text": "1~6 Port or 11~16 Port"
  },
  "vx2000pro_vx1000pro": {
    "status": 1,
    "text": "1~10 Port or 11~20 Port"
  },
  "vx2000pro_vx2000pro": {
    "status": 1,
    "text": "1~10 Port and 11~20 Port"
  },
  "vx2000pro_h_4e": {
    "status": 1,
    "text": "1~10 Port and 11~20 Port"
  },
  "vx2000pro_tu4kpro": {
    "status": 1,
    "text": "1~10 Port and 11~20 Port"
  },
  "novaprouhdjr_mctrl660pro": {
    "status": 1,
    "text": "1~6 Port or 9-14 Port"
  },
  "novaprouhdjr_mctrlr5": {
    "status": 1,
    "text": "1~8 Port or 9~16 Port"
  },
  "novaprouhdjr_mctrl4k": {
    "status": 1,
    "text": "1~8 Port or 9~16 Port"
  },
  "novaprouhdjr_novaprouhdjr": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "novaprouhdjr_h_16": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  },
  "novaprouhdjr_h_4": {
    "status": 1,
    "text": "1~8 Port and 9~16 Port"
  }
};

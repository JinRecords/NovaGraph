// Static offline fallback matrix for Fiber Converter Compatible Tools,
// Product Catalog, and H-Series Configurator.
// Extracted from Novastar bundle to guarantee NovaGraph continues
// working seamlessly offline and survives website changes.

import { CompatDevice, CompatRule, HSeriesCard, HSeriesHost, ProductItem } from '../types';

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

export const STATIC_SERIES_LIST: string[] = [
  "MCTRL Series",
  "COEX 1G",
  "COEX 5G",
  "VX Pro & NovaPro UHD Jr",
  "H Series",
  "Media Server",
  "TB Series",
  "TU Series",
  "LCB Series",
  "Kompass FX3 Pro",
  "AXs Series",
  "MRV Series",
  "TBS driver IC",
  "TBS scan driver IC",
  "Fiber Converter",
  "Camera"
];

export const STATIC_PRODUCTS: ProductItem[] = [
  {
    "id": "MCTRL Series::MCTRL 300",
    "model": "MCTRL 300",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 1300000,
      "Video Source Depth": "8bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 548×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DVI×1",
      "Audio Input": "3.5mm Audio Port×1",
      "Control Method": "USB×1",
      "Output": "Ethernet Port×2",
      "Light Sensor": "Light Sensor Port×1",
      "LCD Control Panel & Quick Configuration": "×",
      "LAN Configuration": "×",
      "Brightness & Color Front Panel Adjustment": "×",
      "Low Latency": "×",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "×",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "×",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "EAC, CE, FCC, IC, PFOS, CB"
    }
  },
  {
    "id": "MCTRL Series::MCTRL 600",
    "model": "MCTRL 600",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2300000,
      "Video Source Depth": "8 / 10 / 12bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 548×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DVI×1, HDMI×1",
      "Audio Input": "3.5mm Audio Port×1\nHDMI Embedded Audio",
      "Control Method": "USB×1",
      "Output": "Ethernet Port×4",
      "Light Sensor": "Light Sensor Port×1",
      "LCD Control Panel & Quick Configuration": "×",
      "LAN Configuration": "×",
      "Brightness & Color Front Panel Adjustment": "×",
      "Low Latency": "×",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "×",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "×",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "CE, FCC, IC, CB, PSE"
    }
  },
  {
    "id": "MCTRL Series::MCTRL 660",
    "model": "MCTRL 660",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2300000,
      "Video Source Depth": "8 / 10 / 12bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 548×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "HDMI×1, DVI×1, HDMI LOOP×1, DVI LOOP×1",
      "Audio Input": "3.5mm Audio Port×1\nHDMI Embedded Audio",
      "Control Method": "USB×1",
      "Output": "Ethernet Port×4",
      "Light Sensor": "×",
      "LCD Control Panel & Quick Configuration": "√",
      "LAN Configuration": "×",
      "Brightness & Color Front Panel Adjustment": "√",
      "Low Latency": "×",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "×",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "×",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, CE,IC,UL/cUL, CCC, PSE, CB, RCM"
    }
  },
  {
    "id": "MCTRL Series::MCTRL660 Pro",
    "model": "MCTRL660 Pro",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2300000,
      "Video Source Depth": "8 / 10 / 12bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 800×2560@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DVI IN×1, DVI LOOP×1, HDMI IN×1, HDMI LOOP×1, 3G-SDI IN×1,3G-SDI LOOP×1",
      "Audio Input": "HDMI Embedded Audio",
      "Control Method": "Ethernet×1, USB IN×1, USB OUT×1",
      "Output": "Ethernet Port×6, 10G SFP+ Port×2",
      "Light Sensor": "×",
      "LCD Control Panel & Quick Configuration": "√",
      "LAN Configuration": "√",
      "Brightness & Color Front Panel Adjustment": "√",
      "Low Latency": "√",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "√",
      "GENLOCK": "√",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "√",
      "Fiber Converter Mode": "√",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, CE, IC, UL/cUL, CCC, PSE, CB, RCM, EAC"
    }
  },
  {
    "id": "MCTRL Series::MCTRL 700",
    "model": "MCTRL 700",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2300000,
      "Video Source Depth": "8bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 548×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DVI×1, DVI LOOP×1, HDMI×1, HDMI LOOP×1",
      "Audio Input": "3.5mm Audio Port×1",
      "Control Method": "USB×1, UART IN×1, UART OUT×1",
      "Output": "Ethernet Port×6",
      "Light Sensor": "×",
      "LCD Control Panel & Quick Configuration": "×",
      "LAN Configuration": "×",
      "Brightness & Color Front Panel Adjustment": "×",
      "Low Latency": "×",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "×",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "×",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, CE, IC, PSE, NTRA, CB"
    }
  },
  {
    "id": "MCTRL Series::MCTRL 700 Pro",
    "model": "MCTRL 700 Pro",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2300000,
      "Video Source Depth": "8bit",
      "Maximum Input": "Max Width: 3840×600@60Hz\nMax Height: 600×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DVI×1, DVI LOOP×1, HDMI×1, HDMI LOOP×1",
      "Audio Input": "3.5mm Audio Port×1",
      "Control Method": "USB×1, Ethernet IN×2",
      "Output": "Ethernet Port×6",
      "Light Sensor": "√",
      "LCD Control Panel & Quick Configuration": "×",
      "LAN Configuration": "√",
      "Brightness & Color Front Panel Adjustment": "×",
      "Low Latency": "√",
      "3D": "×",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "×",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "×",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, CE, IC, CCC"
    }
  },
  {
    "id": "MCTRL Series::MCTRL R5",
    "model": "MCTRL R5",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 4140000,
      "Video Source Depth": "8 / 10bit",
      "Maximum Input": "Max Width: 3840×1080@60Hz\nMax Height: 800×3840@60Hz\nMin: 800×600@60Hz",
      "Video Input": "6G-SDI×1,HDMI1.4×1, Dual DVI×1",
      "Audio Input": "HDMI Embedded Audio",
      "Control Method": "Ethernet×1, USB IN×1, USB OUT×1",
      "Output": "Ethernet Port×8, 10G SFP+ Port×2",
      "Light Sensor": "×",
      "LCD Control Panel & Quick Configuration": "√",
      "LAN Configuration": "√",
      "Brightness & Color Front Panel Adjustment": "√",
      "Low Latency": "×",
      "3D": "×",
      "Free Rotation": "√ (With A8s-N/A10s Plus-N)",
      "Mirror Image": "×",
      "GENLOCK": "√",
      "HDR(HDR10&HLG)": "×",
      "Optical Fiber Port": "√",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, EAC, RoHS, UL&cUL, CE, CB, IC, RCM"
    }
  },
  {
    "id": "MCTRL Series::MCTRL 4K",
    "model": "MCTRL 4K",
    "series": "MCTRL Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 8800000,
      "Video Source Depth": "8 / 10/ 12bit",
      "Maximum Input": "Max Width: 7680×1080@60Hz\nMax Height: 1080×7680@60Hz\nMin: 800×600@60Hz",
      "Video Input": "DP1.2×1, HDMI2.0×1, Dual DVI×2",
      "Audio Input": "HDMI Embedded Audio",
      "Control Method": "USB×1,\nEthernet Port×1",
      "Output": "Ethernet Port×16, 10G SFP+ Port×4",
      "Light Sensor": "×",
      "LCD Control Panel & Quick Configuration": "√",
      "LAN Configuration": "√",
      "Brightness & Color Front Panel Adjustment": "√",
      "Low Latency": "√",
      "3D": "√",
      "Free Rotation": "×",
      "Mirror Image": "×",
      "GENLOCK": "√（Offset Adjustable)",
      "HDR(HDR10&HLG)": "√",
      "Optical Fiber Port": "√",
      "Fiber Converter Mode": "×",
      "Control Software": "NovaLCT",
      "Certiﬁcation Information": "FCC, CE, UL&cUL, EAC, CB, IC, KC, RCM"
    }
  },
  {
    "id": "COEX 1G::MX6000 Pro",
    "model": "MX6000 Pro",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":\"141,000,000 (Max)\",\"Modular Design\":\"√\",\"Input Card Qty\":8,\"Output Card Qty\":8,\"Chassis Height\":\"6U\"}",
      "INPUTS": "{\"Input Interface\":\"Input Card Options:\\nVideo-over-IP\\nMX_1×ST 2110 (100G) Input Card\\nMX_1×ST 2110 (25G) Input Card\\nMX_2×ST 2110 (25G) Input Card\\n8K Level\\nMX_1×DP 1.4 (8K@60Hz) Input Card\\nMX_2×HDMI 2.1 Input Card\\nMX_2×DP 1.4 Input Card\\nMX_1×DP 1.4+1×HDMI 2.1 Input Card\\n4K Level\\nMX_4×HDMI 2.0 Input Card\\nMX_4×DP 1.2 Input Card\\nMX_4×12G-SDI Input Card\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"16384 / 16384\"}",
      "OUTPUTS": "{\"Output Interface\":\"Output Card Options:\\nMX_4×10G_Fiber Output Card \\n( Work with Armor series )\\nMX_1×HDMI 2.0+1×12G-SDI MVR Output Card\",\"S/PDIF  OUT\":\"√\",\"Layers\":\"Up to 32×4K Layers\\nNote: 4×4K layers per output card\",\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA8s Pro A10s Pro\",\"Dynamic Booster\":\"A10s Pro\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"A8s / A8s-N\\nA10s Pro\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"A8s / A8s-N\\nA10s Pro\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"A10s Pro\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB, EAC, PSE, RCM, KC\"}"
    }
  },
  {
    "id": "COEX 1G::MX2000 Pro",
    "model": "MX2000 Pro",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":\"35,380,000 (Max)\",\"Modular Design\":\"√\",\"Input Card Qty\":2,\"Output Card Qty\":2,\"Chassis Height\":\"2U\"}",
      "INPUTS": "{\"Input Interface\":\"Input Card Options:\\nVideo-over-IP\\nMX_1×ST 2110 (100G) Input Card\\nMX_1×ST 2110 (25G) Input Card\\nMX_2×ST 2110 (25G) Input Card\\n8K Level\\nMX_1×DP 1.4 (8K@60Hz) Input Card\\nMX_2×HDMI 2.1 Input Card\\nMX_2×DP 1.4 Input Card\\nMX_1×DP 1.4+1×HDMI 2.1 Input Card\\n4K Level\\nMX_4×HDMI 2.0 Input Card\\nMX_4×DP 1.2 Input Card\\nMX_4×12G-SDI Input Card\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"16384 / 16384\"}",
      "OUTPUTS": "{\"Output Interface\":\"Output Card Options:\\nMX_4×10G_Fiber Output Card \\n( Work with Armor series )\\nMX_1×HDMI 2.0+1×12G-SDI MVR Output Card\",\"S/PDIF  OUT\":\"√\",\"Layers\":\"Up to 8×4K Layers\\nNote: 4×4K layers per output card\",\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA10s Pro\",\"Dynamic Booster\":\"A10s Pro\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"A8s / A8s-N\\nA10s Pro\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"A8s / A8s-N\\nA10s Pro\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"A10s Pro\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB, EAC, PSE, RCM, KC\"}"
    }
  },
  {
    "id": "COEX 1G::MX40 Pro",
    "model": "MX40 Pro",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":\"9,000,000\\n(40-port mode supports 9 million with 10/12bit 60Hz)\",\"Modular Design\":\"×\",\"Input Card Qty\":\"N/A\",\"Output Card Qty\":\"N/A\",\"Chassis Height\":\"2U\"}",
      "INPUTS": "{\"Input Interface\":\"HDMI 2.0 × 3 (IN+LOOP)\\nDP 1.2 × 1\\n12G-SDI × 1 (IN+LOOP)\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"8192 / 8192\"}",
      "OUTPUTS": "{\"Output Interface\":\"EtherCON × 20\\n10G SFP+ Port × 4\",\"S/PDIF  OUT\":\"√\",\"Layers\":4,\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA10s Pro\",\"Dynamic Booster\":\"A10s Pro\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"A8s / A8s-N\\nA10s Pro\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"A8s / A8s-N\\nA10s Pro\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"A10s Pro\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CCC, CE, RoHS, FCC, IC, UL, CB, KC, EAC\"}"
    }
  },
  {
    "id": "COEX 1G::MX30",
    "model": "MX30",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":6500000,\"Modular Design\":\"×\",\"Input Card Qty\":\"N/A\",\"Output Card Qty\":\"N/A\",\"Chassis Height\":\"2U\"}",
      "INPUTS": "{\"Input Interface\":\"HDMI 2.0 × 1 (IN+LOOP)\\nHDMI 1.4 × 1 (IN+LOOP)\\nDP1.1 × 1\\n3G-SDI × 2 (IN+LOOP)\",\"Input Bit Depth\":\"8bit\\n10bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"8192 / 7680\"}",
      "OUTPUTS": "{\"Output Interface\":\"EtherCON × 10\\n10G SFP+ Port × 2\",\"S/PDIF  OUT\":\"√\",\"Layers\":3,\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA10s Pro\",\"Dynamic Booster\":\"×\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"√\",\"Color Replacement\":\"×\",\"3D LUT\":\"×\",\"Color Curve\":\"×\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"A8s / A8s-N\\nA10s Pro\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"×\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"×\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"×\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB, PSE\"}"
    }
  },
  {
    "id": "COEX 1G::MX20",
    "model": "MX20",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":\"3,900,000 (Max)\",\"Modular Design\":\"×\",\"Input Card Qty\":\"N/A\",\"Output Card Qty\":\"N/A\",\"Chassis Height\":\"1U\"}",
      "INPUTS": "{\"Input Interface\":\"HDMI 1.3 × 2 (IN+LOOP)\\n3G-SDI × 1 (IN+LOOP)\",\"Input Bit Depth\":\"8bit\\n10bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\",\"Max. Input Width/Height\":\"3840 / 2560\"}",
      "OUTPUTS": "{\"Output Interface\":\"EtherCON × 6\\n10G SFP+ Port × 2\",\"S/PDIF  OUT\":\"√\",\"Layers\":3,\"Max. Output Width / Height\":\"4096 / 4096\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA10s Pro\",\"Dynamic Booster\":\"×\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"√\",\"Color Replacement\":\"×\",\"3D LUT\":\"×\",\"Color Curve\":\"×\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"×\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"×\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"×\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"×\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB\"}"
    }
  },
  {
    "id": "COEX 1G::KU20",
    "model": "KU20",
    "series": "COEX 1G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity(8Bit & 60Hz)\":\"3,900,000 (Max)\",\"Modular Design\":\"×\",\"Input Card Qty\":\"N/A\",\"Output Card Qty\":\"N/A\",\"Chassis Height\":\"1U\"}",
      "INPUTS": "{\"Input Interface\":\"HDMI 1.3 × 1 (IN+LOOP)\",\"Input Bit Depth\":\"8bit\\n10bit (Custom)\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\",\"Max. Input Width/Height\":\"3840 / 2560\"}",
      "OUTPUTS": "{\"Output Interface\":\"Ethernet Port × 6\\n10G SFP+ Port × 1\",\"S/PDIF  OUT\":\"√\",\"Layers\":1,\"Max. Output Width / Height\":\"4096 / 4096\"}",
      "SYNC": "{\"Genlock Type\":\"×\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"1. COEX Series work with Armor series receiving card, including B6s, A5s Plus, A7s Plus, A8s, A8s-N, A10s Pro.\\n2. Some advanced features are exclusively available on certain models. Details listed below.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster\\n(22bit+/Precise Grayscale/Color Management)\":\"A8s / A8s-N\\nA10s Pro\",\"Dynamic Booster\":\"×\",\"Adaptive\\nThermal Compensation\":\"A10s Pro\",\"Multi-layer Full Grayscale\\nCalibration\":\"A10s Pro\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14Ch Color Correction\":\"×\",\"Color Replacement\":\"×\",\"3D LUT\":\"×\",\"Color Curve\":\"×\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"×\",\"Brightness Overdrive\":\"A10s Pro\",\"Low Latency\\n(<1 Frame)\":\"A8s / A8s-N\\nA10s Pro\",\"Cabinet Rotation (Multiples of 90°)\":\"√\",\"3D\":\"×\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"×\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depend on the driver IC and control system hardware)\\n2. A10s Pro is delivered with a preloaded NCP file. For other Armor series receiving cards, an NCP file can be prepared by the LED display manufacturer prior to shipment to meet specific project requirements.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"×\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CCC, CE, RoHS, FCC, IC, UL, CB, PSE, RCM, EAC, KC\"}"
    }
  },
  {
    "id": "COEX 5G::MX6000 Pro",
    "model": "MX6000 Pro",
    "series": "COEX 5G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity\":\"141,000,000 (Max)\",\"Modular Design\":\"√\",\"Input Card Qty\":8,\"Output Card Qty\":8,\"Chassis Height\":\"6U\"}",
      "INPUTS": "{\"Input Interface\":\"Input Card Options\\nVideo-over-IP\\nMX_1×ST 2110 (100G) Input Card\\nMX_1×ST 2110 (25G) Input Card\\nMX_2×ST 2110 (25G) Input Card\\n8K Level\\nMX_1×DP 1.4 (8K@60Hz) Input Card\\nMX_2×HDMI 2.1 Input Card\\nMX_2×DP 1.4 Input Card\\nMX_1×DP 1.4+1×HDMI 2.1 Input Card\\n4K Level\\nMX_4×HDMI 2.0 Input Card\\nMX_4×DP 1.2 Input Card\\nMX_4×12G-SDI Input Card\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"16384 / 16384\"}",
      "OUTPUTS": "{\"Output Interface\":\"Output Card Options\\nMX_1×40G_Fiber Output Card\\nMX_8×5G_Base-T Output Card \\n(Work with XA50 Pro)\\nMX_1×HDMI 2.0+1×12G-SDI MVR Output Card\",\"Layers\":\"Up to 32×4K Layers\\nNote: 4×4K layers per output card\",\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"COEX Series 5G Solution works with 5G receiving card, including XA50 Pro.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster 2.0\\n(22bit+/Precise Grayscale/Color Management)\":\"√\",\"Dynamic Booster\":\"√\",\"Adaptive\\nThermal Compensation\":\"√\",\"Multi-layer Full Grayscale\\nCalibration\":\"√\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14CH Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"√\",\"Brightness Overdrive\":\"√\",\"Low Latency\\n(<1 Frame)\":\"√\",\"Cabinet Rotation\\n (Multiples of 90°)\":\"√\",\"3D\":\"√\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"√\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depends on the driver IC and control system hardware)\\n2. All 5G receiving cards are delivered with a preloaded NCP file.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB, EAC, PSE, RCM, KC\"}"
    }
  },
  {
    "id": "COEX 5G::MX2000 Pro",
    "model": "MX2000 Pro",
    "series": "COEX 5G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity\":\"35,380,000 (Max)\",\"Modular Design\":\"√\",\"Input Card Qty\":2,\"Output Card Qty\":2,\"Chassis Height\":\"2U\"}",
      "INPUTS": "{\"Input Interface\":\"Input Card Options\\nVideo-over-IP\\nMX_1×ST 2110 (100G) Input Card\\nMX_1×ST 2110 (25G) Input Card\\nMX_2×ST 2110 (25G) Input Card\\n8K Level\\nMX_1×DP 1.4 (8K@60Hz) Input Card\\nMX_2×HDMI 2.1 Input Card\\nMX_2×DP 1.4 Input Card\\nMX_1×DP 1.4+1×HDMI 2.1 Input Card\\n4K Level\\nMX_4×HDMI 2.0 Input Card\\nMX_4×DP 1.2 Input Card\\nMX_4×12G-SDI Input Card\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"16384 / 16384\"}",
      "OUTPUTS": "{\"Output Interface\":\"Output Card Options\\nMX_1×40G_Fiber Output Card\\nMX_8×5G_Base-T Output Card \\n(Work with XA50 Pro)\\nMX_1×HDMI 2.0+1×12G-SDI MVR Output Card\",\"Layers\":\"Up to 8×4K Layers\\nNote: 4×4K layers per output card\",\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"COEX Series 5G Solution works with 5G receiving card, including XA50 Pro.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster 2.0\\n(22bit+/Precise Grayscale/Color Management)\":\"√\",\"Dynamic Booster\":\"√\",\"Adaptive\\nThermal Compensation\":\"√\",\"Multi-layer Full Grayscale\\nCalibration\":\"√\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14CH Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"√\",\"Brightness Overdrive\":\"√\",\"Low Latency\\n(<1 Frame)\":\"√\",\"Cabinet Rotation\\n (Multiples of 90°)\":\"√\",\"3D\":\"√\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"√\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depends on the driver IC and control system hardware)\\n2. All 5G receiving cards are delivered with a preloaded NCP file.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, UL, CB, EAC, PSE, RCM, KC\"}"
    }
  },
  {
    "id": "COEX 5G::CX40 Pro",
    "model": "CX40 Pro",
    "series": "COEX 5G",
    "imageUrl": null,
    "specs": {
      "BASIC INFO": "{\"Loading Capacity\":9000000,\"Modular Design\":\"×\",\"Input Card Qty\":\"N/A\",\"Output Card Qty\":\"N/A\",\"Chassis Height\":\"2U\"}",
      "INPUTS": "{\"Input Interface\":\"HDMI 2.0 × 2 (IN+LOOP)\\nDP 1.2 × 1\\n12G-SDI× 2 (IN+LOOP)\",\"Input Bit Depth\":\"8bit\\n10bit\\n12bit\",\"Input Color Space/Chroma Subsampling\":\"RGB  4:4:4\\nYCbCr  4:4:4\\nYCbCr  4:2:2\\nYCbCr 4:2:0\",\"Max. Input Width/Height\":\"8192 / 8192\"}",
      "OUTPUTS": "{\"Output Interface\":\"5Gbps etherCON Port × 6\\n40G QSFP+ Port × 1\",\"Layers\":3,\"Max. Output Width / Height\":\"16384 / 16384\"}",
      "SYNC": "{\"Genlock Type\":\"Bi-level\\nTri-level\\nBlackburst\",\"Sync with Active Video Input Source/Internal Source\":\"√\",\"Notes for receiving card\":\"COEX Series 5G Solution works with 5G receiving card, including XA50 Pro.\"}",
      "IMAGE QUALITY ENHANCEMENT": "{\"Image Booster 2.0\\n(22bit+/Precise Grayscale/Color Management)\":\"√\",\"Dynamic Booster\":\"√\",\"Adaptive\\nThermal Compensation\":\"√\",\"Multi-layer Full Grayscale\\nCalibration\":\"√\"}",
      "COLOR PROCESSING": "{\"Input Color Adjustment\":\"√\",\"14CH Color Correction\":\"√\",\"Color Replacement\":\"√\",\"3D LUT\":\"√\",\"Color Curve\":\"√\"}",
      "KEY FEATURES": "{\"Free Topology\":\"√\",\"Phase Offset\":\"√\",\"HDR\\n(HDR10/HLG)\":\"√\",\"Brightness Overdrive\":\"√\",\"Low Latency\\n(<1 Frame)\":\"√\",\"Cabinet Rotation\\n (Multiples of 90°)\":\"√\",\"3D\":\"√\",\"Multi-Mode\":\"√\"}",
      "CAMERA SHOOTING ADAPTATION": "{\"Adaptive Frame Rate\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"Frame Multiplication\":\"√\",\"Shutter Fit\":\"Note: \\n1. Need to confirm if IC supports the function;  \\n2. Custom firmware is required for receiving card.\",\"NCP\":\"1. NCP is a file package designed to enhance display performance and simplify maintenance for users. It can include the receiving card firmware, config file, image booster file, adaptive thermal compensation file, multi-mode file and adaptive FR file. (some functions depends on the driver IC and control system hardware)\\n2. All 5G receiving cards are delivered with a preloaded NCP file.\"}",
      "PERIPHERAL": "{\"Multi-function Card (MFN300)\":\"√\",\"Light Sensor (NS060)\":\"√\",\"3D Emitter (EMT200 Pro)\":\"√\"}",
      "SECONDARY DEVELOPMENT INTEGRATION": "{\"API\":\"√\",\"Control Protocol\":\"√\",\"SNMP\":\"√\",\"Art-Net\":\"√\",\"Private Protocol\":\"Customized Support\",\"Certification Information\":\"CE, RoHS, FCC, IC, CCC, CB, UL\"}"
    }
  },
  {
    "id": "VX Pro & NovaPro UHD Jr::VX400 Pro",
    "model": "VX400 Pro",
    "series": "VX Pro & NovaPro UHD Jr",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2600000,
      "Input Video Source Depth": "8 / 10 / 12bit",
      "Maximum and Minimum Input": "Max Width: 8192×1080@60Hz\nMax Height: 1080×8188@60Hz\nMin: 800×600@60Hz",
      "Maximum Output Width/Height": "10240/8192",
      "Video Input": "HDMI2.0×1,HDMI1.3×2\n3G SDI×1\n10G SFP+ (OPT1) ×1, USB3.0 ×1",
      "Output": "Ethernet Port×4\n10G SFP+ Port×2\n3G SDI LOOP×1\nHDMI2.0 LOOP×1 \nHDMI ×1 (Monitor)",
      "Independent Audio IN&OUT": "3.5mm IN&OUT",
      "3D Connector": "√",
      "Light Sensor Connector": "√",
      "Genlock": "×",
      "Max Layers": 6,
      "Max Presets": 256,
      "Synchronization Setting": "Video Input Source",
      "HDR(HDR10&HLG)": "×",
      "OSD": "√ (Text, Weather, Time, Picture)",
      "Handheld Remote Control(optional)": "√",
      "Screen Dehumidification": "√",
      "USB Playback & Upgrade": "√",
      "Free Topology": "√ (No rectangle loading limit)",
      "Low Latency": "√",
      "Standby Mode": "√",
      "Working Mode": "Video controller/Bypass/Fiber converter",
      "Multi-language LCD Menu": "Simplified Chinese, Traditional Chinese, English, Hindi, Spanish, French, Portuguese,Russian, Japanese, Korean, German, Vietnamese, Turkish, Thai and Indonesian",
      "Control Method": "USB, TCP/IP, RS232",
      "Control Protocol": "TCP/IP, UDP, RS232",
      "Control Platform": "NovaLCT / Unico / Unico Web / VICP",
      "Certiﬁcation Information": "CE, FCC, IC, PSE, RCM, EAC, UL, CB, KC, RoHS"
    }
  },
  {
    "id": "VX Pro & NovaPro UHD Jr::VX600 Pro",
    "model": "VX600 Pro",
    "series": "VX Pro & NovaPro UHD Jr",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 3900000,
      "Input Video Source Depth": "8 / 10 / 12bit",
      "Maximum and Minimum Input": "Max Width: 8192×1080@60Hz\nMax Height: 1080×8188@60Hz\nMin: 800×600@60Hz",
      "Maximum Output Width/Height": "10240/8192",
      "Video Input": "HDMI2.0×1,HDMI1.3×2\n3G SDI×1,\n10G SFP+ (OPT1) × 1, USB3.0 × 1",
      "Output": "Ethernet Port×6\n10G SFP+ Port×2\n3G SDI LOOP×1\nHDMI2.0 LOOP×1 \nHDMI ×1 (Monitor)",
      "Independent Audio IN&OUT": "3.5mm IN&OUT",
      "3D Connector": "√",
      "Light Sensor Connector": "√",
      "Genlock": "√",
      "Max Layers": 6,
      "Max Presets": 256,
      "Synchronization Setting": "Video Input Source, Genlock",
      "HDR(HDR10&HLG)": "×",
      "OSD": "√ (Text, Weather, Time, Picture)",
      "Handheld Remote Control(optional)": "√",
      "Screen Dehumidification": "√",
      "USB Playback & Upgrade": "√",
      "Free Topology": "√ (No rectangle loading limit)",
      "Low Latency": "√",
      "Standby Mode": "√",
      "Working Mode": "Video controller/Bypass/Fiber converter",
      "Multi-language LCD Menu": "Simplified Chinese, Traditional Chinese, English, Hindi, Spanish, French, Portuguese,Russian, Japanese, Korean, German, Vietnamese, Turkish, Thai and Indonesian",
      "Control Method": "USB, TCP/IP, RS232",
      "Control Protocol": "TCP/IP, UDP, RS232",
      "Control Platform": "NovaLCT / Unico / Unico Web / VICP",
      "Certiﬁcation Information": "CE, FCC, IC, PSE, RCM, EAC, UL, CB, KC, RoHS"
    }
  },
  {
    "id": "VX Pro & NovaPro UHD Jr::VX1000 Pro",
    "model": "VX1000 Pro",
    "series": "VX Pro & NovaPro UHD Jr",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 6500000,
      "Input Video Source Depth": "8 / 10 / 12bit",
      "Maximum and Minimum Input": "Max Width: 8192×1080@60Hz\nMax Height: 1080×8188@60Hz\nMin: 800×600@60Hz",
      "Maximum Output Width/Height": "10240/8192",
      "Video Input": "HDMI2.0×1,HDMI1.3×2,\n3G SDI×1,\n10G SFP+ (OPT1) × 1, USB3.0 × 1",
      "Output": "Ethernet Port×10\n10G SFP+ Port×2\n3G SDI LOOP×1\nHDMI2.0 LOOP×1 \nHDMI ×1 (Monitor)",
      "Independent Audio IN&OUT": "3.5mm IN&OUT",
      "3D Connector": "√",
      "Light Sensor Connector": "√",
      "Genlock": "√",
      "Max Layers": 6,
      "Max Presets": 256,
      "Synchronization Setting": "Video Input Source, Genlock",
      "HDR(HDR10&HLG)": "×",
      "OSD": "√ (Text, Weather, Time, Picture)",
      "Handheld Remote Control(optional)": "√",
      "Screen Dehumidification": "√",
      "USB Playback & Upgrade": "√",
      "Free Topology": "√ (No rectangle loading limit)",
      "Low Latency": "√",
      "Standby Mode": "√",
      "Working Mode": "Video controller/Bypass/Fiber converter",
      "Multi-language LCD Menu": "Simplified Chinese, Traditional Chinese, English, Hindi, Spanish, French, Portuguese,Russian, Japanese, Korean, German, Vietnamese, Turkish, Thai and Indonesian",
      "Control Method": "USB, TCP/IP, RS232",
      "Control Protocol": "TCP/IP, UDP, RS232",
      "Control Platform": "NovaLCT / Unico / Unico Web / VICP",
      "Certiﬁcation Information": "CE, FCC, IC, PSE, RCM, EAC, UL, CB, KC, RoHS"
    }
  },
  {
    "id": "VX Pro & NovaPro UHD Jr::VX2000 Pro",
    "model": "VX2000 Pro",
    "series": "VX Pro & NovaPro UHD Jr",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 13000000,
      "Input Video Source Depth": "8 / 10 / 12bit",
      "Maximum and Minimum Input": "Max Width: 8192×1080@60Hz\nMax Height: 1080×8188@60Hz\nMin: 800×600@60Hz",
      "Maximum Output Width/Height": "16384/8192",
      "Video Input": "HDMI2.0×2,HDMI1.3×4,DP1.2×1\n12G SDI×1,\n10G SFP+ (OPT1,OPT2) × 2, USB3.0 × 1",
      "Output": "Ethernet Port×20 \n10G SFP+ Port ×4 \n12G SDI LOOP×1\nHDMI ×1 (Monitor)",
      "Independent Audio IN&OUT": "3.5mm IN&OUT",
      "3D Connector": "√",
      "Light Sensor Connector": "√",
      "Genlock": "√",
      "Max Layers": 12,
      "Max Presets": 256,
      "Synchronization Setting": "Video Input Source, Genlock",
      "HDR(HDR10&HLG)": "√",
      "OSD": "√ (Text, Weather, Time, Picture)",
      "Handheld Remote Control(optional)": "√",
      "Screen Dehumidification": "√",
      "USB Playback & Upgrade": "√",
      "Free Topology": "√ (No rectangle loading limit)",
      "Low Latency": "√",
      "Standby Mode": "√",
      "Working Mode": "Video controller/Bypass/Fiber converter",
      "Multi-language LCD Menu": "Simplified Chinese, Traditional Chinese, English, Hindi, Spanish, French, Portuguese,Russian, Japanese, Korean, German, Vietnamese, Turkish, Thai and Indonesian",
      "Control Method": "USB, TCP/IP, RS232",
      "Control Protocol": "TCP/IP, UDP, RS232",
      "Control Platform": "NovaLCT / Unico / Unico Web / VICP",
      "Certiﬁcation Information": "CE, FCC, IC, PSE, RCM, EAC, UL, CB, KC, RoHS"
    }
  },
  {
    "id": "VX Pro & NovaPro UHD Jr::NovaPro UHD Jr",
    "model": "NovaPro UHD Jr",
    "series": "VX Pro & NovaPro UHD Jr",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 10400000,
      "Input Video Source Depth": "8 / 10 / 12bit",
      "Maximum and Minimum Input": "Max Width: 8192×1080@60Hz\nMax Height: 1080×8192@60Hz\nMin: 800×600@60Hz",
      "Maximum Output Width/Height": "16384/8192",
      "Video Input": "HDMI2.0×1, DVI×4 DP1.2×1\n12G SDI×2",
      "Output": "Ethernet Port×16 \n10G SFP+ Port×4 \n12G SDI LOOP×2 HDMI2.0 LOOP×1\nHDMI ×1 (Monitor)",
      "Independent Audio IN&OUT": "×",
      "3D Connector": "×",
      "Light Sensor Connector": "×",
      "Genlock": "√",
      "Max Layers": 3,
      "Max Presets": 10,
      "Synchronization Setting": "Video Input Source, Genlock",
      "HDR(HDR10&HLG)": "√",
      "OSD": "√ (Text, Picture)",
      "Handheld Remote Control(optional)": "×",
      "Screen Dehumidification": "×",
      "USB Playback & Upgrade": "×",
      "Free Topology": "√ (No rectangle loading limit)",
      "Low Latency": "√",
      "Standby Mode": "×",
      "Working Mode": "Video controller/Fiber converter",
      "Multi-language LCD Menu": "Simplified Chinese, English",
      "Control Method": "USB, TCP/IP, RS232",
      "Control Protocol": "TCP/IP, UDP, RS232",
      "Control Platform": "NovaLCT / V-Can",
      "Certiﬁcation Information": "CE, FCC, UL, CB, IC and PSE"
    }
  },
  {
    "id": "H Series::H2",
    "model": "H2",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "2U",
      "Maximum Loading Capacity(pixel)": 52000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "4\n(1 LED 4K Sending Card or 2 Video Card or 2 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "2\n(3 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "2\n(4 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "2\n(4 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "×",
      "LCD Front Panel Touch Control": "×",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H5",
    "model": "H5",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "5U",
      "Maximum Loading Capacity(pixel)": 78000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "10\n(3 LED 4K Sending Card or 3 Video Card or 3 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "3\n(10 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "3\n(10 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "3\n(10 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （1 main +1 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H9",
    "model": "H9",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "9U",
      "Maximum Loading Capacity(pixel)": 130000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "15\n(0 LED 4K Sending Card or 5 Video Card or 5 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "5\n(10 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "5\n(15 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "5\n(15 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （1 main +1 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H9 (Enhanced)",
    "model": "H9 (Enhanced)",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "9U",
      "Maximum Loading Capacity(pixel)": 260000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "15\n(2 LED 4K Sending Card or 5 Video Card or 5 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "5\n(10 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "10\n(10 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "10\n(10 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （1 main +1 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H15",
    "model": "H15",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "15U",
      "Maximum Loading Capacity(pixel)": 260000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "30\n(0 LED 4K Sending Card or 10 Video Card or 10 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "10\n(20 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "10\n(30 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "10\n(30 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （2 main +2 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H15 (Enhanced)",
    "model": "H15 (Enhanced)",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "15U",
      "Maximum Loading Capacity(pixel)": 416000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "30\n(0 LED 4K Sending Card or 10 Video Card or 10 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "16\n(8 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "16\n(24 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "16\n(24 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 5× DL/ 10× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （2 main +2 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, KC, RCM, UKCA, UL, CB, CMIM, PSE"
    }
  },
  {
    "id": "H Series::H20",
    "model": "H20",
    "series": "H Series",
    "imageUrl": null,
    "specs": {
      "Chassis": "20U",
      "Maximum Loading Capacity(pixel)": 520000000,
      "Single Output Card Maximum Width/Height": "2560/2560 pixels (SL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n4096/4096 pixels (DL mode, Single connector of H_4×DVI output card, H_4×HDMI output card, H_4×HDBaseT output card)\n8192/7680 pixels (H_1×HDMI2.0 output card)\n10240/10240 pixels (H_16×RJ45+2×fiber sending card)\n10752/10752 pixels (H_20×RJ45 sending card) \n16384/16384 pixels (H_4×fiber sending card, H_4×fiber sending card-M, H_4×ﬁber sending card(enhanced))",
      "Max,Input Card (Output cards Qty meanwhile)": "40\n(0 LED 4K Sending Card or 20 Video Card or 20 Fiber Card)",
      "Max,Output LED 4K Sending Card (Input card Qty meanwhile)": "20\n(20 Input cards)",
      "Max,Output Fiber Card (Input card Qty meanwhile)": "20\n(40 Input cards)",
      "Max,Output Video Card (Input card Qty meanwhile)": "20\n(40 Input cards)",
      "Input Cards": "H_4×DVI input card, H_4×HDMI input card, H_1×HDMI2.0+1×DP1.2 input card, H_2×RJ45 IP input card, H_4×3G SDI input card, H_2×CVBS+2×VGA input card, H_4×VGA input card, H_2×DP1.1 input card,\nH_1×HDMI2.0 input card,H_1×12G SDI input card, H_1×DP1.2 input card, H_2×HDMI2.0 input card, H_2×HDMI2.0+2×DP1.2 input card, H_2×Audio input+2×Audio output card, H_4×HDBaseT input card, H_STD I/O card, H_1xST 2110 input card, 1xNDI input card, H_1xHDMI2.1+1xDP1.4 input card, H_4×ﬁber input card, H_4×ﬁber input card-M, H_2×DP1.2 input card",
      "Output Cards": "H_16×RJ45+2×ﬁber sending card, H_20×RJ45 sending card, H_2×RJ45+1×HDMI1.3 preview card, H_4×HDMI output card, H_4×DVI output card, H_4×ﬁber sending card, H_4×ﬁber sending card(enhanced), H_4×ﬁber sending card-M, H_4×3G-SDI output card, H_4×HDBaseT output card, H_1×12G SDI output card, H_1×HDMI2.0 output card",
      "Video Output Card Rotation by Multiples of 90˚": "H_4×HDMI output card, H_4×DVI output card,H_4×3G-SDI output card",
      "Support Dual 4K On Single Input Card": "√",
      "Audio Input (Embedded & Independent Audio)": "√",
      "Irregular Screen Mosaic": "√",
      "Maximum Layers Per Output Card": "2× 8K/ 4× 4K/ 8× DL/ 16× SL",
      "Input Connector Capacity Switch (SL/DL/4K/8K)": "√",
      "Multiple Screens Control": "√",
      "Presets": 2000,
      "Input & Device Backup": "√",
      "Permission Management": "√",
      "10bit/HDR/3D": "√",
      "Multiviewer (Preview card required)": "√",
      "Matrix Mode": "√",
      "Standby Mode": "√",
      "Redundant Power Supply (optional)": "√ （3 main +1 backup）",
      "LCD Front Panel Touch Control": "brightness adjustment, OSD turning on/off, preset switch, 3D eye priority switching, screen locking",
      "Control Protocol": "TCP/IP, RS232",
      "SNMP": "√",
      "OpenAPI": "√",
      "Genlock & Phase Offset": "√",
      "Control Platform": "NovaLCT / Web Control / VICP",
      "System Language": "Simplified Chinese, English,  Traditional Chinese, Korean",
      "Certiﬁcation Information": "CCC, CE, FCC, IC, UL, CB, RCM, PSE"
    }
  },
  {
    "id": "Media Server::ET1S-G",
    "model": "ET1S-G",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "1U",
      "Memory": "16G (DDR4)",
      "CPU": "12th Gen Intel® Core™ Processor",
      "Storage": "Default: 250GB M.2 high-speed SSD\nET1S-500G: 500GB M.2 high-speed SSD",
      "Graphics Card Model": "Intel® UHD Graphics",
      "Loading Capacity": "1× 4096×2160@60fps",
      "Decoding Capacity": "1× 4K×2K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "up to 20 layers",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "×",
      "Device Backup": "×",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, RCM, CB, KC",
      "Pre-installed Operating System": "Windows 10 Enterprise LTSC",
      "Playback Software": "Kompass FX3 Pro Basic Edition"
    }
  },
  {
    "id": "Media Server::ET2S-G",
    "model": "ET2S-G",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "2U",
      "Memory": "16G（DDR4）",
      "CPU": "12th Gen Intel® Core™ Processor(i5 12400)",
      "Storage": "500GB M.2 high-speed SSD",
      "Graphics Card Model": "MPGT400",
      "Loading Capacity": "2× 4096×2160@60Hz",
      "Decoding Capacity": "1× 8K×2K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "up to 40 layers",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "×",
      "Device Backup": "×",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC",
      "Pre-installed Operating System": "Windows 10 Enterprise LTSC",
      "Playback Software": "Kompass FX3 Pro Advanced Edition"
    }
  },
  {
    "id": "Media Server::ET4S-G(P2)",
    "model": "ET4S-G(P2)",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "4U",
      "Memory": "32G (DDR5)",
      "CPU": "12th Gen Intel® Core™ Processor(i7 12700)",
      "Storage": "250GB M.2 high-speed SSD (System Driver),1TB M.2 high-speed SSD  (Storage Driver)",
      "Graphics Card Model": "MPG2000",
      "Loading Capacity": "4x 5120*2880@60Hz",
      "Decoding Capacity": "1× 8K×4K@30fps",
      "Program Quantity": "Unlimited",
      "Layer": "Unlimited",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "×",
      "Device Backup": "√",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC",
      "Pre-installed Operating System": "Windows 11 Pro 25H2",
      "Playback Software": "Kompass FX3 Pro Professional Edition"
    }
  },
  {
    "id": "Media Server::ET4S-G(A4)",
    "model": "ET4S-G(A4)",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "4U",
      "Memory": "32G (DDR5)",
      "CPU": "12th Gen Intel® Core™ Processor(i7 12700)",
      "Storage": "250GB M.2 high-speed SSD (System Driver),1TB M.2 high-speed SSD  (Storage Driver)",
      "Graphics Card Model": "HPG4000Ada\n(Sync Card optional)",
      "Loading Capacity": "4x 5120*2880@60Hz",
      "Decoding Capacity": "1× 8K×4K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "Unlimited",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "√ (with Sync Card)",
      "Device Backup": "√",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC",
      "Pre-installed Operating System": "Windows 11 Pro 25H2",
      "Playback Software": "Kompass FX3 Pro Professional Edition"
    }
  },
  {
    "id": "Media Server::ET16S-G(2A4)",
    "model": "ET16S-G(2A4)",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "4U",
      "Memory": "Default 64 GB (DDR4), expandable",
      "CPU": "1× Intel Xeon Gold Processor",
      "Storage": "1TB M.2 high-speed SSD",
      "Graphics Card Model": "2× HPGA4000 + MPGT400 + Sync Card",
      "Loading Capacity": "8x 5120*2880@60Hz",
      "Decoding Capacity": "2x 8K×4K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "Unlimited",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "√",
      "Device Backup": "√",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC, RoHS",
      "Pre-installed Operating System": "Windows 10 Enterprise LTSC",
      "Playback Software": "Kompass FX3 Pro Professional Edition"
    }
  },
  {
    "id": "Media Server::ET16S-G(3A4)",
    "model": "ET16S-G(3A4)",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "4U",
      "Memory": "Default 128 GB (DDR4), expandable",
      "CPU": "2× Intel Xeon Gold Processor",
      "Storage": "1TB M.2 SSD (System Driver) , 960GB U.2 SSD (Storage Driver)",
      "Graphics Card Model": "3× HPGA4000 + MPGT400 + Sync Card",
      "Loading Capacity": "12x 5120*2880@60Hz",
      "Decoding Capacity": "3x 8K×4K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "Unlimited",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "√",
      "Device Backup": "√",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC, RoHS",
      "Pre-installed Operating System": "Windows 10 Enterprise LTSC",
      "Playback Software": "Kompass FX3 Pro Professional Edition"
    }
  },
  {
    "id": "Media Server::ET16S-G(Dual CPU)",
    "model": "ET16S-G(Dual CPU)",
    "series": "Media Server",
    "imageUrl": null,
    "specs": {
      "Chassis": "4U",
      "Memory": "Default 128 GB (DDR4), expandable",
      "CPU": "2× Intel Xeon Gold Processor",
      "Storage": "1TB M.2 SSD (System Driver) , 960GB U.2 SSD (Storage Driver)",
      "Graphics Card Model": "Option 1: 4× HPGA4000 + MPGT400 + Sync Card \nOption 2: 2× HPGA4500a + MPGT400 + Sync Card\nOption 3: 2× HPGA6000 + MPGT400 + Sync Card",
      "Loading Capacity": "Option 1: 16× 5120*2880@60Hz\nOption 2: 8× 5120*2880@60Hz\nOption 3: 8× 5120*2880@60Hz",
      "Decoding Capacity": "Option 1: 4x 8K×4K@60fps \nOption 2: 4x 8K×4K@60fps \nOption 3: 6x 8K×4K@60fps",
      "Program Quantity": "Unlimited",
      "Layer": "Unlimited",
      "EDID Lock": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "√",
      "Device Backup": "√",
      "VICP": "√",
      "Protocol Control": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light",
      "Certiﬁcation Information": "CE, FCC, IC, CB, KC, RoHS",
      "Pre-installed Operating System": "Windows 10 Enterprise LTSC",
      "Playback Software": "Kompass FX3 Pro Professional Edition"
    }
  },
  {
    "id": "TB Series::TB10 Plus",
    "model": "TB10 Plus",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": 650000,
      "Output": "Ethernet Port×1",
      "Maximum Width/Height": "2048/2048\nUltra-long sceen: 8192/2048",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "2GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 3 x 1080P/ 8 x 720P/ 16 x 480P/ 20 x 360P",
      "Synchronous Mode (HDMI Input)": "×",
      "HDMI Output": "×",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS, Lora(optional)",
      "Control Mode": "Ethernet, WiFi AP, USB",
      "Output Backup": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "CE, FCC, IC, CQC, CB, NTRA",
      "Operation System": "Android 10.0"
    }
  },
  {
    "id": "TB Series::TB20 Plus",
    "model": "TB20 Plus",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": 650000,
      "Output": "Ethernet Port×1",
      "Maximum Width/Height": "2048/2048\nUltra-long sceen: 8192/2048",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "2GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 3 x 1080P/ 8 x 720P/ 16 x 480P/ 20 x 360P",
      "Synchronous Mode (HDMI Input)": "√",
      "HDMI Output": "×",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS, Lora(optional)",
      "Control Mode": "Ethernet, WiFi AP, USB",
      "Output Backup": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "CE, FCC, IC, CQC, CB, NTRA",
      "Operation System": "Android 10.0"
    }
  },
  {
    "id": "TB Series::TB30",
    "model": "TB30",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": "1300000 (2 main outputs)\n650000  (1 main and 1 backup)",
      "Output": "Ethernet Port×2",
      "Maximum Width/Height": "4096/4096",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "1GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 2 x 1080P/ 4 x 720P/ 4 x 480P/ 6 x 360P",
      "Synchronous Mode (HDMI Input)": "×",
      "HDMI Output": "×",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS, Lora(optional)",
      "Control Mode": "Ethernet, WiFi AP, USB",
      "Output Backup": "Ethernet Port 2 as fixed backup",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "NBTC, IMDA, PSB, FAC DoC, ENACOM, ICASA, SRRC, NOM-208, EAC DoC, EAC RoHS, RCM, CQC, FCC, UL, IC, KC, CE, UKCA, CB, MIC, PSE, NTRA, PSTI",
      "Operation System": "Android 11.0"
    }
  },
  {
    "id": "TB Series::TB50",
    "model": "TB50",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": 1300000,
      "Output": "Ethernet Port×2",
      "Maximum Width/Height": "4096/4096",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "1GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 2 x 1080P/ 4 x 720P/ 4 x 480P/ 6 x 360P",
      "Synchronous Mode (HDMI Input)": "√",
      "HDMI Output": "√",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS, Lora(optional)",
      "Control Mode": "Ethernet, WiFi AP, USB",
      "Output Backup": "√",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "NBTC, IMDA, PSB, FAC DoC, ENACOM, ICASA, SRRC, EAC DoC, EAC RoHS, RCM, CQC, FCC, UL, IC, KC, CE, UKCA, CB, MIC, PSE, NTRA, PSTI",
      "Operation System": "Android 11.0"
    }
  },
  {
    "id": "TB Series::TB60",
    "model": "TB60",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": 2300000,
      "Output": "Ethernet Port×4",
      "Maximum Width/Height": "4096/4096",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "1GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 2 x 1080P/ 4 x 720P/ 4 x 480P/ 6 x 360P",
      "Synchronous Mode (HDMI Input)": "√",
      "HDMI Output": "√",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS, Lora(optional)",
      "Control Mode": "Ethernet, WiFi AP, USB",
      "Output Backup": "√",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "NBTC, IMDA, PSB, FAC DoC, ENACOM, ICASA, SRRC, EAC DoC, EAC RoHS, RCM, CQC, FCC, UL, IC, KC, CE, UKCA, CB, MIC, PSE, SIRIM, NTRA, PSTI",
      "Operation System": "Android 11.0"
    }
  },
  {
    "id": "TB Series::TCC160",
    "model": "TCC160",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": "Common IC: 512x384 (Single card with 16 x HUB75E)\nPWM IC: 512x512 (Single card with 16 x HUB75E)\n650,000(Cascade receiving cards)",
      "Output": "Ethernet Port×1\nHUB75E×16",
      "Maximum Width/Height": "2048/2048\nUltra long screen : 8192/2560",
      "Decode Ability": "4K@60Hz",
      "Storage & RAM": "2GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 x 4K/ 3 x 1080P/ 8 x 720P/ 16 x 480P/ 20 x 360P",
      "Synchronous Mode (HDMI Input)": "×",
      "HDMI Output": "×",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "NTP, GPS",
      "Control Mode": "Ethernet, WiFi AP",
      "Output Backup": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "CE, FCC, RoHS, NTRA",
      "Operation System": "Android 11.0"
    }
  },
  {
    "id": "TB Series::MBOX600 Pro",
    "model": "MBOX600 Pro",
    "series": "TB Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(pixel）": 2600000,
      "Output": "Ethernet Port× 4",
      "Maximum Width/Height": "4096/1920",
      "Decode Ability": "CPU: Intel® Processor N97",
      "Storage & RAM": "RAM: 4GB/8GB, SSD: 128GB/256GB",
      "USB Flash Drive Expansion": "Up to 256G",
      "Playback Videos": "/",
      "Synchronous Mode (HDMI Input)": "√",
      "HDMI Output": "√",
      "Audio Output": "√",
      "4G (optional)": "√",
      "GPS (optional)": "√",
      "Sync Method": "/",
      "Control Mode": "Ethernet",
      "Output Backup": "√",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "SNMP": "√",
      "Secondary Development": "/",
      "Certiﬁcation Information": "CE, RoHS, FCC, IC, UL, RCM, SRRC, CB",
      "Operation System": "Windows: Windows 10&11 loT Enterprise\nLinux：ubuntu 22.04"
    }
  },
  {
    "id": "TU Series::TU15 Pro",
    "model": "TU15 Pro",
    "series": "TU Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": 2600000,
      "Maximum Width/Height": "4096/1920",
      "Operation System": "Android 11.0",
      "Wi-Fi": "Wi-Fi6 (AP), Wi-Fi5 (Station)",
      "Storage & RAM": "4GB RAM+32GB ROM",
      "Input": "HDMI1.3×2, USB2.0×3",
      "Output": "Ethernet Port×4, HDMI1.3×1",
      "Control": "Gigabit Ethernet Port×1, RS232×1, Sensor×1",
      "Audio Output": "3.5mm Audio Output×1, S/PDIF×1",
      "Playback Videos": "2 x 4K/ 5 x 1080P/ 5 x 720P/ 8 x 480P/ 10 x 360P",
      "Intelligent Broadcast Control": "Handheld Remote, USB Drive, Viplex Express(PC software), Viplex Handy(Phone App), VNNOX(Cloud platform)",
      "Wireless Projection": "Support Type-C / USB Wireless Mirroring Dongle (optional, purchase separately), Support Windows / iOS / Android Multiple Platform Mirroring",
      "Whiteboard": "√ (Use with screen infrared border; Trial available, official version requires separate purchase of activation code)",
      "Screen Connection by Taking Photo (VNNOX CARE App)": "√",
      "Seam Brightness Correction by Taking Photo (VNNOX CARE App)": "√",
      "Intelligent Voice Control": "√",
      "Free Scaling": "√ (one-click scale and custom scale)",
      "lmage Enhancement": "√ (Internal source only)",
      "Effect Adjusting": "√ (Standard, Meeting, Vivid, Skin)",
      "One-click Eye Protection": "√",
      "HDR Video Decoding and Playback": "×",
      "Launcher Customization": "√",
      "Wireless Mirroring Quantity": "1-split screen\n(4-split/9-split screen require separate purchase of activation code)",
      "Boot Animation Customization": "√",
      "4G(optional)": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "Secondary Development": "API, T-SDK",
      "System Language": "Simplified Chinese, English,  Traditional Chinese,  Japanese, Russian, Korean, Portuguese, Spanish, Italian",
      "Certiﬁcation Information": "CE, FCC, IC, MIC, KC, CB, RoHS, PSTI, NTRA, ANATEL"
    }
  },
  {
    "id": "TU Series::TU20 Pro",
    "model": "TU20 Pro",
    "series": "TU Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": "3,900,000(scaling)\n2,880,000(pixel to pixel)",
      "Maximum Width/Height": "4096/1920",
      "Operation System": "Android 11.0",
      "Wi-Fi": "Wi-Fi6 (AP), Wi-Fi5 (Station)",
      "Storage & RAM": "4GB RAM+32GB ROM",
      "Input": "HDMI1.3×2, USB2.0×3",
      "Output": "Ethernet Port×6, HDMI1.3×1",
      "Control": "Gigabit Ethernet Port×1, RS232×1, Sensor×1",
      "Audio Output": "3.5mm Audio Output×1, S/PDIF×1",
      "Playback Videos": "2 x 4K/ 5 x 1080P/ 5 x 720P/ 8 x 480P/ 10 x 360P",
      "Intelligent Broadcast Control": "Handheld Remote, USB Drive, Viplex Express(PC software), Viplex Handy(Phone App), VNNOX(Cloud platform)",
      "Wireless Projection": "Support Type-C / USB Wireless Mirroring Dongle (optional, purchase separately), Support Windows / iOS / Android Multiple Platform Mirroring",
      "Whiteboard": "√ (Use with screen infrared border; Trial available, official version requires separate purchase of activation code)",
      "Screen Connection by Taking Photo (VNNOX CARE App)": "√",
      "Seam Brightness Correction by Taking Photo (VNNOX CARE App)": "√",
      "Intelligent Voice Control": "√",
      "Free Scaling": "√ (one-click scale and custom scale)",
      "lmage Enhancement": "√ (Internal source only)",
      "Effect Adjusting": "√ (Standard, Meeting, Vivid, Skin)",
      "One-click Eye Protection": "√",
      "HDR Video Decoding and Playback": "×",
      "Launcher Customization": "√",
      "Wireless Mirroring Quantity": "1-split screen\n(4-split/9-split screen require separate purchase of activation code)",
      "Boot Animation Customization": "√",
      "4G(optional)": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "Secondary Development": "API, T-SDK",
      "System Language": "Simplified Chinese, English,  Traditional Chinese,  Japanese, Russian, Korean, Portuguese, Spanish, Italian",
      "Certiﬁcation Information": "CE, FCC, IC, MIC, KC, CB, RoHS, PSTI, NTRA, ANATEL"
    }
  },
  {
    "id": "TU Series::TU4K Pro",
    "model": "TU4K Pro",
    "series": "TU Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity (pixel)": "13,000,000(scaling)\n8,800,000(pixel to pixel)",
      "Maximum Width/Height": "16384/8192",
      "Operation System": "Android 13.0",
      "Wi-Fi": "Wi-Fi6 (AP), Wi-Fi5 (Station)",
      "Storage & RAM": "8GB RAM+128GB ROM",
      "Input": "HDMI 1.3×1, HDMI 2.0×2, USB 2.0×1, USB 3.0×1",
      "Output": "Ethernet Port×20, 10G SFP+ Port×2",
      "Control": "Gigabit Ethernet Port×1, RS232×1, Sensor×2",
      "Audio Output": "3.5mm Audio Output×1, S/PDIF×1",
      "Playback Videos": "1 x 8K(H.265/HEVC and VP9 encoding)/2 x 4K/ 5 x 1080P/ 9 x 720P/ 14 x 480P/ 15 x 360P",
      "Intelligent Broadcast Control": "Handheld Remote, USB Drive, Viplex Express(PC software), Viplex Handy(Phone App), VNNOX(Cloud platform)",
      "Wireless Projection": "Support Type-C / USB Wireless Mirroring Dongle (optional, purchase separately), Support Windows / iOS / Android Multiple Platform Mirroring",
      "Whiteboard": "√ (Use with screen infrared border; Trial available, official version requires separate purchase of activation code)",
      "Screen Connection by Taking Photo (VNNOX CARE App)": "√",
      "Seam Brightness Correction by Taking Photo (VNNOX CARE App)": "√",
      "Intelligent Voice Control": "√",
      "Free Scaling": "√ (one-click scale and custom scale)",
      "lmage Enhancement": "√ (Internal source and HDMI1)",
      "Effect Adjusting": "√ (Standard, Meeting, Vivid, Skin)",
      "One-click Eye Protection": "√",
      "HDR Video Decoding and Playback": "√",
      "Launcher Customization": "√",
      "Wireless Mirroring Quantity": "9-split screen",
      "Boot Animation Customization": "√",
      "4G(optional)": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "Secondary Development": "API, T-SDK",
      "System Language": "Simplified Chinese, English,  Traditional Chinese,  Japanese, Russian, Korean, Portuguese, Spanish, Italian",
      "Certiﬁcation Information": "CE, FCC, RoHs, IC, NTRA, UL, CB, PSE, MIC, RCM, SIRIM, KC, ANATEL, SABER"
    }
  },
  {
    "id": "LCB Series::LCB2K",
    "model": "LCB2K",
    "series": "LCB Series",
    "imageUrl": null,
    "specs": {
      "Output": "HDMI 1.4 × 1",
      "Maximum Resolution": "1920×1080@60Hz\nWidth:4096  Height: 3840",
      "Decode Ability": "2K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "1GB RAM+16GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "1 × 4K/ 2 × 1080P/ 4 × 720P/ 4 × 480P/ 6 × 360P",
      "Synchronous Mode (HDMI Input)": "×",
      "HDMI Output": "√",
      "Audio Output": "3.5mm Audio× 1",
      "4G (optional)": "√",
      "Sync Method": "NTP, Lora (optional), GPS (optional)",
      "Control Mode": "Ethernet, WiFi (AP&STA Switchable), 4G Network, USB",
      "Output Backup": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "SRRC, CE, WPC, NTRA",
      "Operation System": "Android 11"
    }
  },
  {
    "id": "LCB Series::LCB4K",
    "model": "LCB4K",
    "series": "LCB Series",
    "imageUrl": null,
    "specs": {
      "Output": "HDMI 2.0 × 1",
      "Maximum Resolution": "4096×2160@60Hz\nWidth: 4096  Height: 4096",
      "Decode Ability": "4K@60Hz, H.265/H.264/VP9",
      "Storage & RAM": "2GB RAM+32GB ROM",
      "USB Flash Drive Expansion": "Up to 128G",
      "Playback Videos": "2 × 4K/ 4 × 1080P/ 6 × 720P/ 8 × 480P/ 10 × 360P",
      "Synchronous Mode (HDMI Input)": "×",
      "HDMI Output": "√",
      "Audio Output": "3.5mm Audio× 1",
      "4G (optional)": "√",
      "Sync Method": "NTP, Lora (optional), GPS (optional)",
      "Control Mode": "Ethernet, WiFi (AP&STA Switchable), 4G Network, USB",
      "Output Backup": "×",
      "Support NovaCloud VNNOX/VNNOX Care": "√",
      "Secondary Development": "API, T-SDK",
      "Certiﬁcation Information": "CQC, SRRC, CE, WPC",
      "Operation System": "Android 11"
    }
  },
  {
    "id": "Kompass FX3 Pro::Kompass FX3 Pro Basic",
    "model": "Kompass FX3 Pro Basic",
    "series": "Kompass FX3 Pro",
    "imageUrl": null,
    "specs": {
      "Decoding Method": "Software decoding and hardware decoding adaptation",
      "Layer Quantity": 20,
      "Program Quantity": "Unlimited",
      "UV Mapping": "√",
      "Screen Management": "×",
      "Trim": "√",
      "Program Insert": "√",
      "Output Quantity": 1,
      "Pre-edit": "√",
      "Output Partitioning": "√",
      "Image Rotation": "√",
      "Console Control": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "×",
      "Device Backup": "×",
      "Color Adjustment": "√",
      "Media Effects": "Fisheye, strobe,  jitter, scroll, mask, border, keying, feather, crop, flip",
      "Progress Management": "√",
      "Volume Control": "Media volume, layer mute, program volume",
      "VICP Control": "√",
      "Protocol Control": "√",
      "Multi-Sound Channel Output": "√",
      "Auto Program Jump": "√",
      "Unattended": "√",
      "Schedules and Logs": "√",
      "Edge Blending": "×",
      "Geometry Adjustment": "×",
      "Projection Mapping": "×",
      "Timeline": "√",
      "Custom Operation Window": "√",
      "Polygon Slices": "√",
      "Activation Method": "Registration code / authorization dongle",
      "Timecode": "√",
      "Output Control": "√",
      "Shortcut Control": "√",
      "AI Assistant": "√",
      "Cloud Media": "×",
      "Spout Media": "√",
      "Independent Preview Window": "√",
      "Capture Card Audio": "√",
      "NVIDIA GPU Configuration Tool": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light"
    }
  },
  {
    "id": "Kompass FX3 Pro::Kompass FX3 Pro Advanced",
    "model": "Kompass FX3 Pro Advanced",
    "series": "Kompass FX3 Pro",
    "imageUrl": null,
    "specs": {
      "Decoding Method": "Software decoding and hardware decoding adaptation",
      "Layer Quantity": 40,
      "Program Quantity": "Unlimited",
      "UV Mapping": "√",
      "Screen Management": "×",
      "Trim": "√",
      "Program Insert": "√",
      "Output Quantity": 3,
      "Pre-edit": "√",
      "Output Partitioning": "√",
      "Image Rotation": "√",
      "Console Control": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "×",
      "Device Backup": "×",
      "Color Adjustment": "√",
      "Media Effects": "Fisheye, strobe,  jitter, scroll, mask, border, keying, feather, crop, flip",
      "Progress Management": "√",
      "Volume Control": "Media volume, layer mute, program volume",
      "VICP Control": "√",
      "Protocol Control": "√",
      "Multi-Sound Channel Output": "√",
      "Auto Program Jump": "√",
      "Unattended": "√",
      "Schedules and Logs": "√",
      "Edge Blending": "√",
      "Geometry Adjustment": "√",
      "Projection Mapping": "√",
      "Timeline": "√",
      "Custom Operation Window": "√",
      "Polygon Slices": "√",
      "Activation Method": "Registration code / authorization dongle",
      "Timecode": "√",
      "Output Control": "√",
      "Shortcut Control": "√",
      "AI Assistant": "√",
      "Cloud Media": "×",
      "Spout Media": "√",
      "Independent Preview Window": "√",
      "Capture Card Audio": "√",
      "NVIDIA GPU Configuration Tool": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light"
    }
  },
  {
    "id": "Kompass FX3 Pro::Kompass FX3 Pro Professional",
    "model": "Kompass FX3 Pro Professional",
    "series": "Kompass FX3 Pro",
    "imageUrl": null,
    "specs": {
      "Decoding Method": "Software decoding and hardware decoding adaptation",
      "Layer Quantity": "Unlimited",
      "Program Quantity": "Unlimited",
      "UV Mapping": "√",
      "Screen Management": "×",
      "Trim": "√",
      "Program Insert": "√",
      "Output Quantity": "Unlimited",
      "Pre-edit": "√",
      "Output Partitioning": "√",
      "Image Rotation": "√",
      "Console Control": "√",
      "Device Link": "√",
      "Frame Sync Mosaic": "√",
      "Device Backup": "√",
      "Color Adjustment": "√",
      "Media Effects": "Fisheye, strobe,  jitter, scroll, mask, border, keying, feather, crop, flip",
      "Progress Management": "√",
      "Volume Control": "Media volume, layer mute, program volume",
      "VICP Control": "√",
      "Protocol Control": "√",
      "Multi-Sound Channel Output": "√",
      "Auto Program Jump": "√",
      "Unattended": "√",
      "Schedules and Logs": "√",
      "Edge Blending": "√",
      "Geometry Adjustment": "√",
      "Projection Mapping": "√",
      "Timeline": "√",
      "Custom Operation Window": "√",
      "Polygon Slices": "√",
      "Activation Method": "Registration code / authorization dongle",
      "Timecode": "√",
      "Output Control": "√",
      "Shortcut Control": "√",
      "AI Assistant": "√",
      "Cloud Media": "×",
      "Spout Media": "√",
      "Independent Preview Window": "√",
      "Capture Card Audio": "√",
      "NVIDIA GPU Configuration Tool": "√",
      "Media Type": "Video, Audio, Image, PowerPoint, Web page, OSD, NDI, Streaming media, Media collection, Capture card, Control command, Executable file, Virtual light"
    }
  },
  {
    "id": "AXs Series::A5s Plus",
    "model": "A5s Plus",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×384",
      "Loading Capacity(10bit)": "256×384",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "32/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "×",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "×",
      "Framerate Adapation": "V1.0",
      "Shutter Fit": "×",
      "Full Grayscale Calibration": "×",
      "Brightness Overdrive": "×",
      "HDR(HDR10&HLG)": "×",
      "18bit+": "√",
      "22bit+": "/",
      "Precise Grayscale": "×",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "×",
      "Firmware Program Readback": "√",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::A7s Plus",
    "model": "A7s Plus",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×512",
      "Loading Capacity(10bit)": "×",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "32/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "×",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "×",
      "Framerate Adapation": "V1.0",
      "Shutter Fit": "×",
      "Full Grayscale Calibration": "×",
      "Brightness Overdrive": "×",
      "HDR(HDR10&HLG)": "×",
      "18bit+": "√",
      "22bit+": "/",
      "Precise Grayscale": "×",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "×",
      "Firmware Program Readback": "√",
      "Low Latency": "×",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::A8s-N",
    "model": "A8s-N",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×384",
      "Loading Capacity(10bit)": "512×256(with non-COEX controller)\n512×384(with COEX controller)",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "32/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "×",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "×",
      "Framerate Adapation": "V1.0",
      "Shutter Fit": "×",
      "Full Grayscale Calibration": "×",
      "Brightness Overdrive": "×",
      "HDR(HDR10&HLG)": "√",
      "18bit+": "/",
      "22bit+": "√",
      "Precise Grayscale": "√",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "√",
      "Firmware Program Readback": "√",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::A8s Pro",
    "model": "A8s Pro",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×512",
      "Loading Capacity(10bit)": "512×384(with non-COEX controller)\n512×512(with COEX controller)",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "40/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "×",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "×",
      "Framerate Adapation": "V1.0",
      "Shutter Fit": "×",
      "Full Grayscale Calibration": "√ (2 layers)",
      "Brightness Overdrive": "×",
      "HDR(HDR10&HLG)": "√",
      "18bit+": "/",
      "22bit+": "√",
      "Precise Grayscale": "√",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "×",
      "Firmware Program Readback": "√",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::A10s Plus-N",
    "model": "A10s Plus-N",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×512",
      "Loading Capacity(10bit)": "512×384",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "32/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "×",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "×",
      "Framerate Adapation": "V1.0",
      "Shutter Fit": "×",
      "Full Grayscale Calibration": "×",
      "Brightness Overdrive": "×",
      "HDR(HDR10&HLG)": "√",
      "18bit+": "/",
      "22bit+": "√",
      "Precise Grayscale": "√",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "√",
      "Firmware Program Readback": "√",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::A10s Pro",
    "model": "A10s Pro",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×512",
      "Loading Capacity(10bit)": "512×384(with non-COEX controller)\n512×512(with COEX controller)",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "32/64",
      "Transmission Rate": "1G",
      "Communication Connectors": "High-Density Connectors",
      "Input Connectors": "RJ45",
      "Certification": "RoHS, EMC Class B",
      "Dynamic Booster": "√ (with MX40 Pro/MX2000 Pro/MX6000 Pro)",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "√",
      "Framerate Adapation": "V1.0/2.0/3.0",
      "Shutter Fit": "√ (with MX40 Pro/MX2000 Pro/MX6000 Pro)",
      "Full Grayscale Calibration": "√ (4 layers)",
      "Brightness Overdrive": "√",
      "HDR(HDR10&HLG)": "√",
      "18bit+": "/",
      "22bit+": "√",
      "Precise Grayscale": "√",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "√",
      "Firmware Program Readback": "/",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "AXs Series::XA50 Pro",
    "model": "XA50 Pro",
    "series": "AXs Series",
    "imageUrl": null,
    "specs": {
      "Loading Capacity(8bit default)": "512×1024",
      "Loading Capacity(10bit)": "512×1024",
      "Max. Parallel RGB Data Groups/ Max. Serial Data Groups": "40/64",
      "Transmission Rate": "5G",
      "Communication Connectors": "DDR3",
      "Input Connectors": "RJ45/Type-C/OPT",
      "Certification": "RoHS, EMC Class A",
      "Dynamic Booster": "√ (with CX40 Pro/MX2000 Pro/MX6000 Pro)",
      "Multi-mode": "√",
      "Adaptive Thermal Compensation": "√",
      "Framerate Adapation": "V1.0/2.0/3.0",
      "Shutter Fit": "√ (with CX40 Pro/MX2000 Pro/MX6000 Pro)",
      "Full Grayscale Calibration": "√ (4 layers)",
      "Brightness Overdrive": "√",
      "HDR(HDR10&HLG)": "√",
      "18bit+": "/",
      "22bit+": "√",
      "Precise Grayscale": "√",
      "Color Management": "√",
      "Dual-card Backup": "√",
      "Automatic Calibration": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "Bright and Dark Lines Adjustment": "√",
      "3D": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Rotation by Multiples of 90˚": "√",
      "Module Flash Management": "√",
      "Mapping": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "×",
      "Bit Error Testing": "√",
      "Dual Power Supply Detection": "√",
      "Redundancy Backup": "√",
      "Calibration Coefﬁcient Backup": "×",
      "Firmware Program Readback": "/",
      "Low Latency": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√"
    }
  },
  {
    "id": "MRV Series::MRV208-N",
    "model": "MRV208-N",
    "series": "MRV Series",
    "imageUrl": null,
    "specs": {
      "Max. Parallel RGB Data Groups": 16,
      "Loading Capacity(pixel)": "512×512",
      "Output Interface": "HUB75×8",
      "Max. Scanning": 64,
      "Certification": "EMC Class A, RoHS",
      "Dynamic Sub-pixel": "×",
      "3D": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "18bit+": "√",
      "Color Management": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Low Latency": "√",
      "Multi-batch Adjustment": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√",
      "Redundancy Backup": "√",
      "Dual Configuration File Backup": "×",
      "Dual Firmware Program Backup": "√",
      "Firmware Program Read-back": "√",
      "Rotation by Multiples of 90˚": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Mapping": "√"
    }
  },
  {
    "id": "MRV Series::MRV412-N",
    "model": "MRV412-N",
    "series": "MRV Series",
    "imageUrl": null,
    "specs": {
      "Max. Parallel RGB Data Groups": 24,
      "Loading Capacity(pixel)": "512×512",
      "Output Interface": "HUB75×12",
      "Max. Scanning": 64,
      "Certification": "EMC Class A, RoHS",
      "Dynamic Sub-pixel": "×",
      "3D": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "18bit+": "√",
      "Color Management": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Low Latency": "√",
      "Multi-batch Adjustment": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√",
      "Redundancy Backup": "√",
      "Dual Configuration File Backup": "√",
      "Dual Firmware Program Backup": "√",
      "Firmware Program Read-back": "√",
      "Rotation by Multiples of 90˚": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Mapping": "√"
    }
  },
  {
    "id": "MRV Series::MRV416-N",
    "model": "MRV416-N",
    "series": "MRV Series",
    "imageUrl": null,
    "specs": {
      "Max. Parallel RGB Data Groups": 32,
      "Loading Capacity(pixel)": "512×512",
      "Output Interface": "HUB75×16",
      "Max. Scanning": 64,
      "Certification": "EMC Class A, RoHS",
      "Dynamic Sub-pixel": "×",
      "3D": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "18bit+": "√",
      "Color Management": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Low Latency": "√",
      "Multi-batch Adjustment": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√",
      "Redundancy Backup": "√",
      "Dual Configuration File Backup": "√",
      "Dual Firmware Program Backup": "√",
      "Firmware Program Read-back": "√",
      "Rotation by Multiples of 90˚": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Mapping": "√"
    }
  },
  {
    "id": "MRV Series::MRV532",
    "model": "MRV532",
    "series": "MRV Series",
    "imageUrl": null,
    "specs": {
      "Max. Parallel RGB Data Groups": 40,
      "Loading Capacity(pixel)": "512×512",
      "Output Interface": "HUB320×10",
      "Max. Scanning": 64,
      "Certification": "EMC Class A, RoHS",
      "Dynamic Sub-pixel": "√",
      "3D": "√",
      "Pixel Level Brightness and Chroma Calibration": "√",
      "18bit+": "√",
      "Color Management": "√",
      "RGB Gamma Independent Adjustment": "√",
      "Low Latency": "√",
      "Multi-batch Adjustment": "√",
      "Temperature, Voltage and Communication Status Monitoring": "√",
      "Redundancy Backup": "√",
      "Dual Configuration File Backup": "√",
      "Dual Firmware Program Backup": "√",
      "Firmware Program Read-back": "√",
      "Rotation by Multiples of 90˚": "√",
      "Prestore Picture": "√",
      "Support for 5-pin LCD": "√",
      "Bit Error Testing": "√",
      "Mapping": "√"
    }
  },
  {
    "id": "TBS driver IC::A1664",
    "model": "A1664",
    "series": "TBS driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-anode",
      "Numbers of Output Channel": 16,
      "Supported Scans": "1~64S",
      "Power Supply Voltage Range": "3.3~5.5 V",
      "Output Current per Channel": "0.1~20 mA",
      "Grayscale Level (PWM+PAM)": "20 bit",
      "Current Accuracy Between Channels": "±1.25%",
      "Current Accuracy Between ICs": "±1.25%",
      "Supported Maximum Refresh Rate": "3840/7680/15360/30720 Hz",
      "White Balance Resistor": "Internal",
      "Refresh Rate Enhancement": "√",
      "S-PWM Technology": "√",
      "LED Error Detection": "√",
      "Chip-level Dynamic Power Saving": "√",
      "Standby Mode for Power Saving": "√",
      "Pixel-level Dynamic Power Saving": "√",
      "LED Open Circuit Detection & Protection": "√",
      "RoHS Compliant Package": "SSOP24/QFN24"
    }
  },
  {
    "id": "TBS driver IC::5266A",
    "model": "5266A",
    "series": "TBS driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-anode",
      "Numbers of Output Channel": 16,
      "Supported Scans": "1~64S",
      "Power Supply Voltage Range": "3.8~5 V",
      "Output Current per Channel": "0.2~20 mA",
      "Grayscale Level (PWM+PAM)": "16 bit",
      "Current Accuracy Between Channels": "±1.5%",
      "Current Accuracy Between ICs": "±1.5%",
      "Supported Maximum Refresh Rate": "3840/7680/15360 Hz",
      "White Balance Resistor": "External",
      "Refresh Rate Enhancement": "√",
      "S-PWM Technology": "√",
      "LED Error Detection": "√",
      "Chip-level Dynamic Power Saving": "√",
      "Standby Mode for Power Saving": "√",
      "Pixel-level Dynamic Power Saving": "√",
      "LED Open Circuit Detection & Protection": "√",
      "RoHS Compliant Package": "SSOP24/QFN24"
    }
  },
  {
    "id": "TBS driver IC::5267A",
    "model": "5267A",
    "series": "TBS driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-cathode",
      "Numbers of Output Channel": 16,
      "Supported Scans": "1~64S",
      "Power Supply Voltage Range": "2.8~5 V",
      "Output Current per Channel": "0.2~20 mA",
      "Grayscale Level (PWM+PAM)": "16 bit",
      "Current Accuracy Between Channels": "±1.5%",
      "Current Accuracy Between ICs": "±1.5%",
      "Supported Maximum Refresh Rate": "3840/7680/15360 Hz",
      "White Balance Resistor": "External",
      "Refresh Rate Enhancement": "√",
      "S-PWM Technology": "√",
      "LED Error Detection": "√",
      "Chip-level Dynamic Power Saving": "√",
      "Standby Mode for Power Saving": "√",
      "Pixel-level Dynamic Power Saving": "√",
      "LED Open Circuit Detection & Protection": "√",
      "RoHS Compliant Package": "SSOP24/QFN24"
    }
  },
  {
    "id": "TBS driver IC::5367",
    "model": "5367",
    "series": "TBS driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-cathode",
      "Numbers of Output Channel": 48,
      "Supported Scans": "20S×3",
      "Power Supply Voltage Range": "2.8/3.8~5 V",
      "Output Current per Channel": "0.1~10 mA",
      "Grayscale Level (PWM+PAM)": "24 bit",
      "Current Accuracy Between Channels": "±2%",
      "Current Accuracy Between ICs": "±1.5%",
      "Supported Maximum Refresh Rate": "3840/7680/15360 Hz",
      "White Balance Resistor": "External",
      "Refresh Rate Enhancement": "√",
      "S-PWM Technology": "√",
      "LED Error Detection": "√",
      "Chip-level Dynamic Power Saving": "√",
      "Standby Mode for Power Saving": "√",
      "Pixel-level Dynamic Power Saving": "√",
      "LED Open Circuit Detection & Protection": "√",
      "RoHS Compliant Package": "QFN88"
    }
  },
  {
    "id": "TBS scan driver IC::TBS2008",
    "model": "TBS2008",
    "series": "TBS scan driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-anode",
      "Numbers of Output Channel": 8,
      "Package A": "SOP16",
      "Package B": "QFN16",
      "Operating Current": "2.5 A",
      "Operating Voltage Range": "3.3~5 V",
      "Decoding": "Serial",
      "Ghost Cancellation": "√",
      "Short-circuit Protection": "√",
      "Adjustable Clamp Voltage": "√"
    }
  },
  {
    "id": "TBS scan driver IC::TBS3008",
    "model": "TBS3008",
    "series": "TBS scan driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-anode",
      "Numbers of Output Channel": 16,
      "Package A": "SSOP24",
      "Package B": "QFN24",
      "Operating Current": "2 A",
      "Operating Voltage Range": "3.3~5 V",
      "Decoding": "Serial",
      "Ghost Cancellation": "√",
      "Short-circuit Protection": "√",
      "Adjustable Clamp Voltage": "√"
    }
  },
  {
    "id": "TBS scan driver IC::TBS2009",
    "model": "TBS2009",
    "series": "TBS scan driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-cathode",
      "Numbers of Output Channel": 8,
      "Package A": "SOP16",
      "Package B": "QFN16",
      "Operating Current": "2.5 A",
      "Operating Voltage Range": "3.3~5 V",
      "Decoding": "Serial",
      "Ghost Cancellation": "√",
      "Short-circuit Protection": "√",
      "Adjustable Clamp Voltage": "√"
    }
  },
  {
    "id": "TBS scan driver IC::TBS2109A",
    "model": "TBS2109A",
    "series": "TBS scan driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-cathode",
      "Numbers of Output Channel": 8,
      "Package A": "SOP16",
      "Package B": "/",
      "Operating Current": "2.5 A",
      "Operating Voltage Range": "3.3~5 V",
      "Decoding": "Serial",
      "Ghost Cancellation": "√",
      "Short-circuit Protection": "√",
      "Adjustable Clamp Voltage": "√"
    }
  },
  {
    "id": "TBS scan driver IC::TBS3009",
    "model": "TBS3009",
    "series": "TBS scan driver IC",
    "imageUrl": null,
    "specs": {
      "Supported LED Types": "Common-cathode",
      "Numbers of Output Channel": 16,
      "Package A": "SSOP24",
      "Package B": "QFN24",
      "Operating Current": "1.7A",
      "Operating Voltage Range": "3.3~5V",
      "Decoding": "Serial",
      "Ghost Cancellation": "√",
      "Short-circuit Protection": "√",
      "Adjustable Clamp Voltage": "√"
    }
  },
  {
    "id": "Fiber Converter::CVT310",
    "model": "CVT310",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Multi-mode",
      "Number of Optical Port": 1,
      "Optical Fiber Bandwidth": "1.25 Gbps",
      "Number of Network Port": "Ethernet Gigabit ports ×1",
      "Optical Fiber Backup": "×",
      "Optical Fiber Format": "Multi-mode twin-core LC optical ports",
      "Transmission Distance": "550 Meters",
      "Power Supply": "3-Pin Power Socket",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "×",
      "Number of SFP modules come with the device": 1,
      "Certiﬁcation Information": "CE, RoHS, EAC, FCC, IC, PSE, NTRA"
    }
  },
  {
    "id": "Fiber Converter::CVT320",
    "model": "CVT320",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Single-mode",
      "Number of Optical Port": 1,
      "Optical Fiber Bandwidth": "1.25 Gbps",
      "Number of Network Port": "Ethernet Gigabit ports ×1",
      "Optical Fiber Backup": "×",
      "Optical Fiber Format": "Single-mode twin-core LC optical ports",
      "Transmission Distance": "20 Kilometers",
      "Power Supply": "3-Pin Power Socket",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "×",
      "Number of SFP modules come with the device": 1,
      "Certiﬁcation Information": "CE, RoHS, EAC, FCC, IC, PSE, NTRA"
    }
  },
  {
    "id": "Fiber Converter::CVT10-S",
    "model": "CVT10-S",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Single-mode",
      "Number of Optical Port": 2,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Ethernet Gigabit ports ×10",
      "Optical Fiber Backup": "OPT1 Primary, OPT2 Backup",
      "Optical Fiber Format": "Single-mode twin-core LC optical ports",
      "Transmission Distance": "10 Kilometers",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, RoHS, FCC, CB, IC, KC, UL, RCM"
    }
  },
  {
    "id": "Fiber Converter::CVT10-M",
    "model": "CVT10-M",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Multi-mode",
      "Number of Optical Port": 2,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Ethernet Gigabit ports ×10",
      "Optical Fiber Backup": "OPT1 Primary, OPT2 Backup",
      "Optical Fiber Format": "Multi-mode twin-core LC optical ports",
      "Transmission Distance": "300 Meters",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, RoHS, FCC, CB, IC, KC, UL, RCM"
    }
  },
  {
    "id": "Fiber Converter::CVT10 Pro-S",
    "model": "CVT10 Pro-S",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Single-mode",
      "Number of Optical Port": 2,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Neutrik Ethernet Gigabit ports ×10",
      "Optical Fiber Backup": "OPT1 Primary, OPT2 Backup",
      "Optical Fiber Format": "Single-mode twin-core LC optical ports",
      "Transmission Distance": "10 Kilometers",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, FCC, IC, UL, CB, RCM, KC"
    }
  },
  {
    "id": "Fiber Converter::CVT10 Pro-M",
    "model": "CVT10 Pro-M",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Multi-mode",
      "Number of Optical Port": 2,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Neutrik Ethernet Gigabit ports ×10",
      "Optical Fiber Backup": "OPT1 Primary, OPT2 Backup",
      "Optical Fiber Format": "Multi-mode twin-core LC optical ports",
      "Transmission Distance": "300 Meters",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, FCC, IC, UL, CB, RCM, KC"
    }
  },
  {
    "id": "Fiber Converter::CVT4K-S",
    "model": "CVT4K-S",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Single-mode",
      "Number of Optical Port": 4,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Neutrik Ethernet Gigabit ports ×16",
      "Optical Fiber Backup": "OPT1&2 Primary, OPT3&4 Backup",
      "Optical Fiber Format": "Single-mode twin-core LC optical ports",
      "Transmission Distance": "10 Kilometers",
      "Power Supply": "PowerCON /\n3-Pin Power Socket",
      "Dual Power Supply Backup": "√",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB / Ethernet",
      "Number of SFP modules come with the device": 4,
      "Certiﬁcation Information": "CE, RoHS, FCC, UL&CUL, EAC, CB, IC, RCM"
    }
  },
  {
    "id": "Fiber Converter::CVT4K-M",
    "model": "CVT4K-M",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Multi-mode",
      "Number of Optical Port": 4,
      "Optical Fiber Bandwidth": "10 Gbps",
      "Number of Network Port": "Neutrik Ethernet Gigabit ports ×16",
      "Optical Fiber Backup": "OPT1&2 Primary, OPT3&4 Backup",
      "Optical Fiber Format": "Multi-mode twin-core LC optical ports",
      "Transmission Distance": "300 Meters",
      "Power Supply": "PowerCON /\n3-Pin Power Socket",
      "Dual Power Supply Backup": "√",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB / Ethernet",
      "Number of SFP modules come with the device": 4,
      "Certiﬁcation Information": "CE, RoHS, FCC, UL&CUL, EAC, CB, IC, RCM"
    }
  },
  {
    "id": "Fiber Converter::CVT8-5GS",
    "model": "CVT8-5GS",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Single-mode",
      "Number of Optical Port": 1,
      "Optical Fiber Bandwidth": "40 Gbps",
      "Number of Network Port": "5G BaseT Ethernet ports ×8",
      "Optical Fiber Backup": "×",
      "Optical Fiber Format": "Single-mode twin-core LC optical ports",
      "Transmission Distance": "10 Kilometers",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, RoHS, FCC, IC, UL, CB"
    }
  },
  {
    "id": "Fiber Converter::CVT8-5GM",
    "model": "CVT8-5GM",
    "series": "Fiber Converter",
    "imageUrl": null,
    "specs": {
      "Optical Module": "Multi-mode",
      "Number of Optical Port": 1,
      "Optical Fiber Bandwidth": "40 Gbps",
      "Number of Network Port": "5G BaseT Ethernet ports ×8",
      "Optical Fiber Backup": "×",
      "Optical Fiber Format": "Multi-mode 8-core MPO optical ports",
      "Transmission Distance": "100 Meters",
      "Power Supply": "PowerCON",
      "Dual Power Supply Backup": "×",
      "SFP Module Hot Pluggable": "√",
      "Control Method": "Type-B USB",
      "Number of SFP modules come with the device": 2,
      "Certiﬁcation Information": "CE, RoHS, FCC, IC, UL, CB"
    }
  },
  {
    "id": "Camera::C3200",
    "model": "C3200",
    "series": "Camera",
    "imageUrl": null,
    "specs": {
      "Total Pixels": "32 Megapixels",
      "Communication Interface": "Gigabit Ethernet",
      "Sensor Resolution": "6464×4852",
      "Maximum Frame Rate": "1.7 fps",
      "Time Consuming for 4K screen": "30 Minutes(super resolution imaging); 84 Minutes(pixel by pixel)",
      "Measurement Accuracy": "Luminance (Y) ±3%\nChromaticity coordinates (x, y) ±0.003",
      "Short Term Repeatability": "Luminance (Y) ±0.15%\nChromaticity coordinates (x, y) ±0.0006",
      "IP Rating": "IP6X Camera body",
      "Communcation Port": "Gigabit Ethernet",
      "Input Voltage": "AC 100-240 V~50/60 Hz, 1.7 A",
      "Output Voltage": "12.0 V, 3.33 A, 40W",
      "Operating Enviroment Temperature": "0°C~30°C",
      "Operating Enviroment Humidity": "20%~70%, non-condensing",
      "Physical Specﬁcation": "156mm × 147mm x 128mm",
      "Lens Type": "Nikon F bayonet; 35mm",
      "Cooling": "/",
      "Net Weight": "2.8 kg"
    }
  },
  {
    "id": "Camera::NOS-CC60",
    "model": "NOS-CC60",
    "series": "Camera",
    "imageUrl": null,
    "specs": {
      "Total Pixels": "61 Megapixels",
      "Communication Interface": "USB 3.0 Port",
      "Sensor Resolution": "9568×6380",
      "Maximum Frame Rate": "3.97 fps",
      "Time Consuming for 4K screen": "20 Minutes(super resolution imaging); 40 Minutes(pixel by pixel)",
      "Measurement Accuracy": "Luminance (Y) ±2%\nChromaticity coordinates (x, y) ±0.002",
      "Short Term Repeatability": "Luminance (Y) ±0.15%\nChromaticity coordinates (x, y) ±0.0004",
      "IP Rating": "IP5X Camera body",
      "Communcation Port": "USB 3.0 Port",
      "Input Voltage": "AC 100-240 V~50/60 Hz, 1.5 A",
      "Output Voltage": "19.0 V, 4.74 A, 90.06 W",
      "Operating Enviroment Temperature": "–10°C ~ 50°C",
      "Operating Enviroment Humidity": "20%~70%, non-condensing",
      "Physical Specﬁcation": "236 mm ×236 mm ×288 mm with 50mm lens;\n280 mm ×236 mm ×288 mm with 135mm lens",
      "Lens Type": "Nikon F bayonet; 50 or 135 mm fixed-focus lens (Only one fixed-focus lens is included by default.)",
      "Cooling": "Semiconductor bipolar thermoelectric cooling",
      "Net Weight": "9.8 kg"
    }
  }
];

export const STATIC_H_SERIES_HOSTS: HSeriesHost[] = [
  {
    "id": "h2",
    "name": "H2",
    "unit": 2,
    "image": "https://img.novastar.show/products/h2.webp",
    "supportsRedundantPower": false,
    "baseInputCapacity": 4,
    "baseOutputCapacity": 2
  },
  {
    "id": "h5",
    "name": "H5",
    "unit": 5,
    "image": "https://img.novastar.show/products/h5.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 10,
    "baseOutputCapacity": 3
  },
  {
    "id": "h9",
    "name": "H9",
    "unit": 9,
    "image": "https://img.novastar.show/products/h9.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 15,
    "baseOutputCapacity": 5
  },
  {
    "id": "h9_enhanced",
    "name": "H9 (Enhanced)",
    "unit": 9,
    "image": "https://img.novastar.show/products/h9.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 15,
    "baseOutputCapacity": 10
  },
  {
    "id": "h15",
    "name": "H15",
    "unit": 15,
    "image": "https://img.novastar.show/products/h15.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 30,
    "baseOutputCapacity": 10
  },
  {
    "id": "h15_enhanced",
    "name": "H15 (Enhanced)",
    "unit": 15,
    "image": "https://img.novastar.show/products/h15.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 30,
    "baseOutputCapacity": 16
  },
  {
    "id": "h20",
    "name": "H20",
    "unit": 20,
    "image": "https://img.novastar.show/products/h20.webp",
    "supportsRedundantPower": true,
    "baseInputCapacity": 40,
    "baseOutputCapacity": 20
  }
];

export const STATIC_H_SERIES_INPUT_CARDS: HSeriesCard[] = [
  {
    "id": "h_1xhdmi2_1_1xdp1_4_input_card",
    "name": "H_1xHDMI2.1+1xDP1.4 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xhdmi2_1_1xdp1_4.webp",
    "interfaces": [
      {
        "type": "HDMI 2.1",
        "count": 1
      },
      {
        "type": "DP 1.4",
        "count": 1
      }
    ],
    "note": "Only one connector can be used at a time (HDMI 2.1 or DP 1.4)."
  },
  {
    "id": "h_2xdp1_2_input_card",
    "name": "H_2xDP1.2 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xdp1_2.webp",
    "interfaces": [
      {
        "type": "DP 1.2",
        "count": 2
      }
    ]
  },
  {
    "id": "h_1xhdmi2_0_1xdp1_2_input_card",
    "name": "H_1xHDMI2.0+1xDP1.2 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xhdmi2_0_1xdp1_2.webp",
    "interfaces": [
      {
        "type": "HDMI 2.0",
        "count": 1
      },
      {
        "type": "DP 1.2",
        "count": 1
      }
    ],
    "note": "Only one connector can be used at a time (HDMI 2.0 or DP 1.2)."
  },
  {
    "id": "h_2xhdmi2_0_2xdp1_2_input_card",
    "name": "H_2xHDMI2.0+2xDP1.2 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xhdmi2_0_2xdp1_2.webp",
    "interfaces": [
      {
        "type": "HDMI 2.0",
        "count": 2
      },
      {
        "type": "DP 1.2",
        "count": 2
      }
    ],
    "note": "Two groups; each group uses either HDMI 2.0 or DP 1.2."
  },
  {
    "id": "h_1xdp1_2_input_card",
    "name": "H_1xDP1.2 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xdp1_2.webp",
    "interfaces": [
      {
        "type": "DP 1.2",
        "count": 1
      }
    ]
  },
  {
    "id": "h_1xst2110_input_card",
    "name": "H_1xST2110 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xst2110.webp",
    "interfaces": [
      {
        "type": "ST 2110",
        "count": 1
      }
    ]
  },
  {
    "id": "h_1x12g_sdi_input_card",
    "name": "H_1x12G SDI input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1x12g_sdi.webp",
    "interfaces": [
      {
        "type": "12G SDI",
        "count": 1
      }
    ]
  },
  {
    "id": "h_2xhdmi2_0_input_card",
    "name": "H_2xHDMI2.0 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xhdmi2_0.webp",
    "interfaces": [
      {
        "type": "HDMI 2.0",
        "count": 2
      }
    ]
  },
  {
    "id": "h_1xhdmi2_0_input_card",
    "name": "H_1xHDMI2.0 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xhdmi2_0.webp",
    "interfaces": [
      {
        "type": "HDMI 2.0",
        "count": 1
      }
    ]
  },
  {
    "id": "h_4xfiber_input_card",
    "name": "H_4xfiber input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4xfiber.webp",
    "interfaces": [
      {
        "type": "Fiber",
        "count": 4
      }
    ]
  },
  {
    "id": "h_2xdp1_1_input_card",
    "name": "H_2xDP1.1 input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xdp1_1.webp",
    "interfaces": [
      {
        "type": "DP 1.1",
        "count": 2
      }
    ]
  },
  {
    "id": "h_4xdvi_input_card",
    "name": "H_4xDVI input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4xdvi.webp",
    "interfaces": [
      {
        "type": "DVI",
        "count": 4
      }
    ]
  },
  {
    "id": "h_4xhdmi_input_card",
    "name": "H_4xHDMI input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4xhdmi.webp",
    "interfaces": [
      {
        "type": "HDMI 1.3",
        "count": 2
      },
      {
        "type": "HDMI 1.4",
        "count": 2
      }
    ],
    "note": "Mode-dependent: HDMI 1.4 allows 2 ports; HDMI 1.3 allows 4 ports."
  },
  {
    "id": "h_2xrj45_ip_input_card",
    "name": "H_2xRJ45 IP input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xrj45_ip.webp",
    "interfaces": [
      {
        "type": "RJ45 IP",
        "count": 2
      }
    ]
  },
  {
    "id": "h_4x3g_sdi_input_card",
    "name": "H_4x3G SDI input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4x3g_sdi.webp",
    "interfaces": [
      {
        "type": "3G SDI",
        "count": 4
      }
    ]
  },
  {
    "id": "h_2xcvbs_2xvga_input_card",
    "name": "H_2xCVBS+2xVGA input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xcvbs_2xvga.webp",
    "interfaces": [
      {
        "type": "CVBS",
        "count": 2
      },
      {
        "type": "VGA",
        "count": 2
      }
    ]
  },
  {
    "id": "h_4xvga_input_card",
    "name": "H_4xVGA input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4xvga.webp",
    "interfaces": [
      {
        "type": "VGA",
        "count": 4
      }
    ]
  },
  {
    "id": "h_2xaudio_input_2xaudio_output_card",
    "name": "H_2xAudio input+2xAudio output card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_2xaudio.webp",
    "interfaces": [
      {
        "type": "Audio In",
        "count": 2
      },
      {
        "type": "Audio Out",
        "count": 2
      }
    ]
  },
  {
    "id": "h_4xhdbaset_input_card",
    "name": "H_4xHDBaseT input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_4xhdbaset.webp",
    "interfaces": [
      {
        "type": "HDBaseT",
        "count": 4
      }
    ]
  },
  {
    "id": "h_1xndi_input_card",
    "name": "H_1xNDI input card",
    "type": "input",
    "slots": 1,
    "image": "https://img.novastar.show/cards/input/h_1xndi.webp",
    "interfaces": [
      {
        "type": "NDI",
        "count": 1
      }
    ]
  }
];

export const STATIC_H_SERIES_OUTPUT_CARDS: HSeriesCard[] = [
  {
    "id": "h_16xrj45_2xfiber_sending_card",
    "name": "H_16xRJ45+2xfiber sending card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_16xrj45_2xfiber.webp",
    "interfaces": [
      {
        "type": "RJ45",
        "count": 16
      },
      {
        "type": "Fiber",
        "count": 2
      }
    ]
  },
  {
    "id": "h_20xrj45_sending_card",
    "name": "H_20xRJ45 sending card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_20xrj45.webp",
    "interfaces": [
      {
        "type": "RJ45",
        "count": 20
      }
    ]
  },
  {
    "id": "h_4xfiber_sending_card",
    "name": "H_4xfiber sending card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4xfiber.webp",
    "interfaces": [
      {
        "type": "Fiber",
        "count": 4
      }
    ]
  },
  {
    "id": "h_4xfiber_sending_card_enhanced",
    "name": "H_4xfiber sending card (enhanced)",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4xfiber_enhanced.webp",
    "interfaces": [
      {
        "type": "Fiber",
        "count": 4
      }
    ]
  },
  {
    "id": "h_4xhdmi_output_card",
    "name": "H_4xHDMI output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4xhdmi.webp",
    "interfaces": [
      {
        "type": "HDMI 1.4",
        "count": 4
      }
    ]
  },
  {
    "id": "h_1xhdmi2_0_output_card",
    "name": "H_1xHDMI2.0 output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_1xhdmi2_0.webp",
    "interfaces": [
      {
        "type": "HDMI 2.0",
        "count": 1
      }
    ]
  },
  {
    "id": "h_4x3g_sdi_output_card",
    "name": "H_4x3G SDI output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4x3g_sdi.webp",
    "interfaces": [
      {
        "type": "3G SDI",
        "count": 4
      }
    ]
  },
  {
    "id": "h_1x12g_sdi_output_card",
    "name": "H_1x12G SDI output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_1x12g_sdi.webp",
    "interfaces": [
      {
        "type": "12G SDI",
        "count": 1
      }
    ]
  },
  {
    "id": "h_4xdvi_output_card",
    "name": "H_4xDVI output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4xdvi.webp",
    "interfaces": [
      {
        "type": "DVI",
        "count": 4
      }
    ]
  },
  {
    "id": "h_4xhdbaset_output_card",
    "name": "H_4xHDBaseT output card",
    "type": "output",
    "slots": 1,
    "image": "https://img.novastar.show/cards/output/h_4xhdbaset.webp",
    "interfaces": [
      {
        "type": "HDBaseT",
        "count": 4
      }
    ]
  }
];

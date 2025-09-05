# 🎨 Brand Color System

## Overview

This document defines the consistent color palette for the prediction market application. All colors are explicitly defined in `globals.css` and work seamlessly in both light and dark modes.

---

## 🎯 **Brand Color Palette**

### **Success (Green)**
- **Primary**: `text-success` / `bg-success` 
  - Light: `#22c55e` (Green-500)
  - Dark: `#16a34a` (Green-600)
- **Foreground**: `text-success-foreground` - Always white
- **Muted**: `bg-success-muted` - For backgrounds and subtle accents

**Usage**: Positive trends, "YES" outcomes, profit indicators, success states

### **Error (Red)**
- **Primary**: `text-error` / `bg-error`
  - Light: `#ef4444` (Red-500) 
  - Dark: `#dc2626` (Red-600)
- **Foreground**: `text-error-foreground` - Always white
- **Muted**: `bg-error-muted` - For backgrounds and subtle accents

**Usage**: Negative trends, "NO" outcomes, loss indicators, error states

### **Info (Light Blue)**
- **Primary**: `text-info` / `bg-info`
  - Light: `#3b82f6` (Blue-500)
  - Dark: `#2563eb` (Blue-600)
- **Foreground**: `text-info-foreground` - Always white
- **Muted**: `bg-info-muted` - For backgrounds and subtle accents

**Usage**: Chart time segmentation, informational states, neutral actions

### **Warning (Amber)**
- **Primary**: `text-warning` / `bg-warning`
  - Light: `#f59e0b` (Amber-500)
  - Dark: `#d97706` (Amber-600)
- **Foreground**: `text-warning-foreground` - Always white  
- **Muted**: `bg-warning-muted` - For backgrounds and subtle accents

**Usage**: Caution states, pending actions, important notices

---

## 🌑 **Gray Scale System**

Consistent gray scale that automatically adapts to light/dark modes:

```css
/* Light Mode → Dark Mode */
text-brand-gray-50   /* #f9fafb → #030712 */
text-brand-gray-100  /* #f3f4f6 → #111827 */
text-brand-gray-200  /* #e5e7eb → #1f2937 */
text-brand-gray-300  /* #d1d5db → #374151 */
text-brand-gray-400  /* #9ca3af → #4b5563 */
text-brand-gray-500  /* #6b7280 → #6b7280 */ /* Same in both modes */
text-brand-gray-600  /* #4b5563 → #9ca3af */
text-brand-gray-700  /* #374151 → #d1d5db */
text-brand-gray-800  /* #1f2937 → #e5e7eb */
text-brand-gray-900  /* #111827 → #f3f4f6 */
text-brand-gray-950  /* #030712 → #f9fafb */
```

**Usage**: Replace all instances of `text-gray-X` with `text-brand-gray-X`

---

## 📊 **Chart Colors**

Optimized for data visualization:

- **Chart 1**: Orange (existing) - Primary data series
- **Chart 2**: `var(--info)` - Time segmentation (light blue)  
- **Chart 3**: `var(--success)` - Positive trends (green)
- **Chart 4**: `var(--error)` - Negative trends (red)
- **Chart 5**: `var(--warning)` - Warnings/alerts (amber)

---

## 🚀 **Usage Examples**

### **Before (Inconsistent)**
```tsx
// ❌ Don't use random color variants
<div className="text-green-400 bg-red-500 border-blue-600">
<span className="text-green-300 hover:text-green-500">
```

### **After (Brand Consistent)**
```tsx
// ✅ Use brand color system
<div className="text-success bg-error border-info">
<span className="text-success hover:text-success">

// ✅ For gray text, use brand grays
<p className="text-brand-gray-400 bg-brand-gray-800">
```

---

## 🔄 **Migration Guide**

### **Common Replacements**

| Old Class | New Class |
|-----------|-----------|
| `text-green-400` | `text-success` |
| `text-green-500` | `text-success` |
| `text-red-400` | `text-error` |
| `text-red-500` | `text-error` |
| `bg-green-600/20` | `bg-success-muted` |
| `bg-red-600/20` | `bg-error-muted` |
| `text-blue-500` | `text-info` |
| `border-green-600/30` | `border-success` |
| `text-gray-*` | `text-brand-gray-*` |

### **Component Updates**

**Badges:**
```tsx
// ✅ Consistent badge styling
<Badge className="bg-success-muted text-success border-success">
  YES
</Badge>
<Badge className="bg-error-muted text-error border-error">
  NO  
</Badge>
```

**Buttons:**
```tsx
// ✅ Semantic button colors
<Button className="bg-success hover:bg-success text-success-foreground">
  Place Bet
</Button>
<Button className="bg-error hover:bg-error text-error-foreground">
  Cancel
</Button>
```

**Status Indicators:**
```tsx
// ✅ Consistent status colors
<div className="text-success">✅ Transaction successful</div>
<div className="text-error">❌ Transaction failed</div>
<div className="text-info">ℹ️ Processing transaction</div>
<div className="text-warning">⚠️ Low balance warning</div>
```

---

## ✨ **Hover & Interactive States**

All brand colors include hover states:

```css
hover:bg-success    /* Success hover background */
hover:text-success  /* Success hover text */
hover:bg-error      /* Error hover background */
hover:text-error    /* Error hover text */
hover:bg-info       /* Info hover background */
hover:text-info     /* Info hover text */
hover:bg-warning    /* Warning hover background */  
hover:text-warning  /* Warning hover text */
```

---

## 🎯 **Best Practices**

### **Semantic Usage**
- Use **success** for positive outcomes, profits, YES votes
- Use **error** for negative outcomes, losses, NO votes  
- Use **info** for neutral information, chart time segments
- Use **warning** for cautions, pending states, important notices

### **Accessibility**
- All brand colors meet WCAG AA contrast requirements
- Foreground colors are always white for maximum contrast
- Gray scale provides sufficient contrast in both light/dark modes

### **Consistency** 
- Always use brand colors instead of arbitrary Tailwind variants
- Use muted variants for subtle backgrounds
- Stick to the defined gray scale for all text/background grays

---

*This color system ensures visual consistency, accessibility compliance, and seamless dark mode support across the entire application.*

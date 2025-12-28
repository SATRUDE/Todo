# Calendar Styling Approaches

This document describes 10 different approaches to fix the selected day styling in the calendar component.

## Requirements
- Default days: **white text**
- Selected days: **white background** with **black text**

## Approach 1: `aria-selected` variant with `!important` in day class
**File:** `calendar-approach1.tsx`
- Uses `aria-selected:!bg-white aria-selected:!text-black` in the `day` class
- Empty `day_selected` class
- Relies on Tailwind's `aria-selected:` variant

## Approach 2: `day_selected` class with `!important`
**File:** `calendar-approach2.tsx`
- Uses `!bg-white !text-black` in the `day_selected` class
- Includes hover and focus states
- Relies on react-day-picker applying the `day_selected` class

## Approach 3: `[&[aria-selected='true']]` selector with `!important`
**File:** `calendar-approach3.tsx`
- Uses `[&[aria-selected='true']]:!bg-white [&[aria-selected='true']]:!text-black` in the `day` class
- Empty `day_selected` class
- Uses Tailwind's arbitrary variant syntax

## Approach 4: Combining both day and day_selected with `!important`
**File:** `calendar-approach4.tsx`
- Uses both `[&[aria-selected='true']]:!bg-white [&[aria-selected='true']]:!text-black` in `day` class
- AND `!bg-white !text-black` in `day_selected` class
- Double coverage approach

## Approach 5: Using `aria-selected` without `!important`
**File:** `calendar-approach5.tsx`
- Uses `[&[aria-selected='true']]:bg-white [&[aria-selected='true']]:text-black` (no `!important`)
- Also sets `bg-white text-black` in `day_selected`
- Relies on CSS specificity

## Approach 6: Removing `text-white` from day, only applying to non-selected
**File:** `calendar-approach6.tsx`
- Uses `[&:not([aria-selected='true'])]:text-white` to only apply white text to non-selected days
- Sets `bg-white text-black` in `day_selected`
- Avoids the conflict by not applying white text to selected days

## Approach 7: Using `modifiersClassNames` prop
**File:** `calendar-approach7.tsx`
- Uses react-day-picker's `modifiersClassNames` prop
- Sets `selected: "bg-white text-black"`
- Also sets `day_selected` class
- Uses react-day-picker's modifier system

## Approach 8: Using `modifiersClassNames` with `!important`
**File:** `calendar-approach8.tsx`
- Uses `modifiersClassNames={{ selected: "!bg-white !text-black" }}`
- Empty `day_selected` class
- Relies on react-day-picker's modifier system with `!important`

## Approach 9: Using `aria-selected` with hover states
**File:** `calendar-approach9.tsx`
- Uses `[&[aria-selected='true']]:bg-white [&[aria-selected='true']]:text-black`
- Includes hover states: `[&[aria-selected='true']]:hover:bg-white [&[aria-selected='true']]:hover:text-black`
- Empty `day_selected` class

## Approach 10: Combining `modifiersClassNames` and `day_selected`
**File:** `calendar-approach10.tsx`
- Uses both `modifiersClassNames={{ selected: "bg-white text-black" }}`
- AND `day_selected: "bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black"`
- Double coverage with explicit states

## How to Test

1. Import the desired approach in `DeadlineModal.tsx`:
```tsx
import { Calendar } from "./ui/calendar-approach1"; // Change number as needed
```

2. Test each approach to see which one works correctly

3. Once you find the working approach, replace the original `calendar.tsx` with that approach

## Additional CSS Support

The `src/styles/globals.css` file includes a global rule:
```css
button[aria-selected="true"] {
  background-color: white !important;
  color: black !important;
}
```

This should help ensure selected days are styled correctly regardless of which approach is used.



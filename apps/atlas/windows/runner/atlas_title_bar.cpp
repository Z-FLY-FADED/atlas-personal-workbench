#include "atlas_title_bar.h"

#include <commctrl.h>
#include <windowsx.h>

#include <algorithm>
#include "resource.h"

namespace {
constexpr COLORREF kBackground = RGB(240, 234, 224);
constexpr COLORREF kBorder = RGB(230, 221, 208);
constexpr COLORREF kInk = RGB(62, 53, 47);
constexpr COLORREF kMuted = RGB(115, 100, 88);
constexpr COLORREF kTerracotta = RGB(153, 84, 56);
constexpr COLORREF kCream = RGB(255, 244, 230);
constexpr UINT kButtonId = 0xA710;
constexpr int kHitTests[] = {HTMINBUTTON, HTMAXBUTTON, HTCLOSE};
constexpr const wchar_t* kLabels[] = {
    L"\u6700\u5c0f\u5316", L"\u6700\u5927\u5316", L"\u5173\u95ed"};

void FillRounded(HDC dc, RECT rect, int radius, COLORREF color) {
  HBRUSH brush = CreateSolidBrush(color);
  HGDIOBJ old_brush = SelectObject(dc, brush);
  HGDIOBJ old_pen = SelectObject(dc, GetStockObject(NULL_PEN));
  RoundRect(dc, rect.left, rect.top, rect.right, rect.bottom, radius, radius);
  SelectObject(dc, old_pen);
  SelectObject(dc, old_brush);
  DeleteObject(brush);
}
}  // namespace

int AtlasTitleBar::Scale(int logical) const {
  return MulDiv(logical, static_cast<int>(GetDpiForWindow(window_)), 96);
}

int AtlasTitleBar::Height() const { return Scale(44); }

bool AtlasTitleBar::Create(HWND window) {
  window_ = window;
  INITCOMMONCONTROLSEX controls{sizeof(controls), ICC_STANDARD_CLASSES};
  InitCommonControlsEx(&controls);
  tooltip_ = CreateWindowExW(WS_EX_TOPMOST, TOOLTIPS_CLASSW, nullptr,
                            WS_POPUP | TTS_ALWAYSTIP | TTS_NOPREFIX,
                            CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
                            CW_USEDEFAULT, window_, nullptr, nullptr, nullptr);
  if (tooltip_) {
    SendMessage(tooltip_, TTM_SETMAXTIPWIDTH, 0, Scale(180));
  }
  for (int i = 0; i < 3; ++i) {
    buttons_[i] = CreateWindowW(
        L"BUTTON", kLabels[i], WS_CHILD | WS_VISIBLE | BS_OWNERDRAW,
        0, 0, 0, 0, window_, reinterpret_cast<HMENU>(
            static_cast<INT_PTR>(kButtonId + i)), GetModuleHandle(nullptr), nullptr);
    if (!buttons_[i]) return false;
    SetWindowSubclass(buttons_[i], ButtonProc, 1, 0);
    if (tooltip_) {
      TOOLINFOW tool{sizeof(tool)};
      tool.hwnd = window_;
      tool.uId = kButtonId + i;
      tool.lpszText = const_cast<wchar_t*>(kLabels[i]);
      SendMessageW(tooltip_, TTM_ADDTOOLW, 0, reinterpret_cast<LPARAM>(&tool));
    }
  }
  Layout();
  return true;
}

RECT AtlasTitleBar::ButtonRect(int index) const {
  RECT client{};
  GetClientRect(window_, &client);
  const int left = client.right - Scale(10 + (3 - index) * 44);
  return RECT{left, Scale(7), left + Scale(40), Scale(37)};
}

void AtlasTitleBar::Layout() {
  if (!window_) return;
  const bool maximized = IsZoomed(window_) != FALSE;
  for (int i = 0; i < 3; ++i) {
    if (!buttons_[i]) continue;
    const RECT rect = ButtonRect(i);
    MoveWindow(buttons_[i], rect.left, rect.top, rect.right - rect.left,
               rect.bottom - rect.top, TRUE);
    const wchar_t* label = i == 1 && maximized
        ? L"\u8fd8\u539f" : kLabels[i];
    SetWindowTextW(buttons_[i], label);
    if (tooltip_) {
      TOOLINFOW tool{sizeof(tool)};
      tool.hwnd = window_;
      tool.uId = kButtonId + i;
      tool.rect = rect;
      tool.lpszText = const_cast<wchar_t*>(label);
      SendMessageW(tooltip_, TTM_NEWTOOLRECTW, 0, reinterpret_cast<LPARAM>(&tool));
      SendMessageW(tooltip_, TTM_UPDATETIPTEXTW, 0, reinterpret_cast<LPARAM>(&tool));
    }
  }
  RECT caption{};
  GetClientRect(window_, &caption);
  caption.bottom = Height();
  InvalidateRect(window_, &caption, FALSE);
}

// Let the top-level window report HTMAXBUTTON for Windows 11 snap layouts.
// Keeping actual BUTTON controls also retains named UI Automation actions.
LRESULT CALLBACK AtlasTitleBar::ButtonProc(HWND button, UINT message,
                                          WPARAM wparam, LPARAM lparam,
                                          UINT_PTR subclass_id, DWORD_PTR data) {
  if (message == WM_NCHITTEST) return HTTRANSPARENT;
  if (message == WM_NCDESTROY) {
    RemoveWindowSubclass(button, ButtonProc, subclass_id);
  }
  return DefSubclassProc(button, message, wparam, lparam);
}

int AtlasTitleBar::ButtonAt(POINT point) const {
  for (int i = 0; i < 3; ++i) {
    const RECT rect = ButtonRect(i);
    if (PtInRect(&rect, point)) return i;
  }
  return -1;
}

void AtlasTitleBar::SetHovered(int index) {
  if (hovered_ == index) return;
  const int old = hovered_;
  hovered_ = index;
  if (old >= 0) InvalidateRect(buttons_[old], nullptr, FALSE);
  if (hovered_ >= 0) InvalidateRect(buttons_[hovered_], nullptr, FALSE);
}

void AtlasTitleBar::ResetPressed() {
  const int old = pressed_;
  pressed_ = -1;
  if (old >= 0) InvalidateRect(buttons_[old], nullptr, FALSE);
}

void AtlasTitleBar::Invoke(int index) {
  const WPARAM command = index == 0 ? SC_MINIMIZE : index == 1
      ? (IsZoomed(window_) ? SC_RESTORE : SC_MAXIMIZE) : SC_CLOSE;
  PostMessage(window_, WM_SYSCOMMAND, command, 0);
}

void AtlasTitleBar::Paint(HDC dc) {
  RECT rect{};
  GetClientRect(window_, &rect);
  rect.bottom = Height();
  HBRUSH background = CreateSolidBrush(kBackground);
  FillRect(dc, &rect, background);
  DeleteObject(background);
  RECT line{rect.left, rect.bottom - 1, rect.right, rect.bottom};
  HBRUSH border = CreateSolidBrush(kBorder);
  FillRect(dc, &line, border);
  DeleteObject(border);

  const int top = Scale(10);
  HICON icon = static_cast<HICON>(LoadImageW(GetModuleHandle(nullptr),
      MAKEINTRESOURCEW(IDI_APP_ICON), IMAGE_ICON, Scale(24), Scale(24), LR_SHARED));
  if (icon) DrawIconEx(dc, Scale(16), top, icon, Scale(24), Scale(24), 0, nullptr, DI_NORMAL);

  const int saved = SaveDC(dc);
  // Clip branding on narrow windows so it never overlaps window controls.
  IntersectClipRect(dc, Scale(48), 0, ButtonRect(0).left - Scale(8), Height());
  SetBkMode(dc, TRANSPARENT);
  SetTextColor(dc, GetActiveWindow() == window_ ? kInk : kMuted);
  HFONT brand_font = CreateFontW(-Scale(14), 0, 0, 0, FW_SEMIBOLD, FALSE,
      FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
      CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");
  HGDIOBJ old_font = SelectObject(dc, brand_font);
  RECT brand{Scale(51), 0, ButtonRect(0).left - Scale(8), Height()};
  DrawTextW(dc, L"WorkSpace", -1, &brand, DT_SINGLELINE | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS);
  SelectObject(dc, old_font);
  DeleteObject(brand_font);
  RestoreDC(dc, saved);
}

void AtlasTitleBar::PaintButton(const DRAWITEMSTRUCT& item) {
  const int index = static_cast<int>(item.CtlID - kButtonId);
  const bool hovered = hovered_ == index;
  const bool pressed = pressed_ == index && hovered;
  HBRUSH background = CreateSolidBrush(kBackground);
  FillRect(item.hDC, &item.rcItem, background);
  DeleteObject(background);
  const bool close_emphasis = index == 2 && (hovered || pressed);
  const COLORREF fill = index == 2
      ? (close_emphasis ? (pressed ? RGB(125, 66, 43) : kTerracotta)
                        : RGB(235, 218, 205))
      : (pressed ? RGB(219, 207, 190) : RGB(230, 220, 204));
  if (hovered || pressed || index == 2) {
    FillRounded(item.hDC, item.rcItem, Scale(9), fill);
  }
  HPEN pen = CreatePen(PS_SOLID, std::max(1, Scale(1)),
                       close_emphasis ? kCream : kMuted);
  HGDIOBJ old_pen = SelectObject(item.hDC, pen);
  HGDIOBJ old_brush = SelectObject(item.hDC, GetStockObject(NULL_BRUSH));
  const int cx = (item.rcItem.right + item.rcItem.left) / 2;
  const int cy = (item.rcItem.bottom + item.rcItem.top) / 2;
  const int half = Scale(5);
  if (index == 0) {
    MoveToEx(item.hDC, cx - half, cy, nullptr);
    LineTo(item.hDC, cx + half + 1, cy);
  } else if (index == 1) {
    if (IsZoomed(window_)) {
      RECT back{cx - Scale(2), cy - half, cx + half + 1, cy + Scale(2)};
      Rectangle(item.hDC, back.left, back.top, back.right, back.bottom);
      RECT front{cx - half, cy - Scale(2), cx + Scale(2) + 1, cy + half + 1};
      FillRounded(item.hDC, front, 0, hovered ? fill : kBackground);
      Rectangle(item.hDC, front.left, front.top, front.right, front.bottom);
    } else {
      Rectangle(item.hDC, cx - half, cy - half, cx + half + 1, cy + half + 1);
    }
  } else {
    MoveToEx(item.hDC, cx - half, cy - half, nullptr);
    LineTo(item.hDC, cx + half + 1, cy + half + 1);
    MoveToEx(item.hDC, cx + half, cy - half, nullptr);
    LineTo(item.hDC, cx - half - 1, cy + half + 1);
  }
  SelectObject(item.hDC, old_brush);
  SelectObject(item.hDC, old_pen);
  DeleteObject(pen);
  if ((item.itemState & ODS_FOCUS) != 0) {
    RECT focus = item.rcItem;
    InflateRect(&focus, -Scale(3), -Scale(3));
    DrawFocusRect(item.hDC, &focus);
  }
}

std::optional<LRESULT> AtlasTitleBar::HandleMessage(UINT message, WPARAM wparam,
                                                  LPARAM lparam) {
  if (!window_) return std::nullopt;
  switch (message) {
    case WM_NCHITTEST: {
      POINT point{GET_X_LPARAM(lparam), GET_Y_LPARAM(lparam)};
      ScreenToClient(window_, &point);
      RECT client{};
      GetClientRect(window_, &client);
      // Preserve the native side/bottom borders and the top resizing edge.
      if (!PtInRect(&client, point)) return std::nullopt;
      if (!IsZoomed(window_) && point.y < Scale(6)) {
        const int corner = Scale(12);
        return point.x < corner ? HTTOPLEFT : point.x >= client.right - corner
            ? HTTOPRIGHT : HTTOP;
      }
      const int button = ButtonAt(point);
      if (button >= 0) return kHitTests[button];
      if (point.y < Height()) {
        return point.x < Scale(44) ? HTSYSMENU : HTCAPTION;
      }
      return std::nullopt;
    }
    case WM_NCMOUSEMOVE:
    case WM_MOUSEMOVE: {
      POINT point{GET_X_LPARAM(lparam), GET_Y_LPARAM(lparam)};
      if (message == WM_NCMOUSEMOVE) ScreenToClient(window_, &point);
      SetHovered(ButtonAt(point));
      TRACKMOUSEEVENT tracking{sizeof(tracking), TME_LEAVE |
          (message == WM_NCMOUSEMOVE ? TME_NONCLIENT : 0u), window_, 0};
      TrackMouseEvent(&tracking);
      if (tooltip_) {
        MSG relay{window_, WM_MOUSEMOVE, 0, MAKELPARAM(point.x, point.y), 0, {0, 0}};
        SendMessage(tooltip_, TTM_RELAYEVENT, 0, reinterpret_cast<LPARAM>(&relay));
      }
      // DefWindowProc still sees HTMAXBUTTON hover for system snap layouts.
      return std::nullopt;
    }
    case WM_NCMOUSELEAVE:
    case WM_MOUSELEAVE:
      SetHovered(-1);
      if (tooltip_) SendMessage(tooltip_, TTM_POP, 0, 0);
      return std::nullopt;
    case WM_NCLBUTTONDOWN: {
      POINT point{GET_X_LPARAM(lparam), GET_Y_LPARAM(lparam)};
      ScreenToClient(window_, &point);
      const int index = ButtonAt(point);
      if (index < 0) return std::nullopt;
      pressed_ = index;
      SetHovered(index);
      SetCapture(window_);
      InvalidateRect(buttons_[index], nullptr, FALSE);
      if (tooltip_) SendMessage(tooltip_, TTM_POP, 0, 0);
      return 0;
    }
    case WM_LBUTTONUP:
      if (pressed_ >= 0) {
        POINT point{GET_X_LPARAM(lparam), GET_Y_LPARAM(lparam)};
        const int invoke = ButtonAt(point) == pressed_ ? pressed_ : -1;
        ResetPressed();
        ReleaseCapture();
        if (invoke >= 0) Invoke(invoke);
        return 0;
      }
      return std::nullopt;
    case WM_CANCELMODE:
      if (GetCapture() == window_) ReleaseCapture();
      ResetPressed();
      return std::nullopt;
    case WM_CAPTURECHANGED:
      ResetPressed();
      return std::nullopt;
    case WM_COMMAND: {
      const UINT id = LOWORD(wparam);
      if (id >= kButtonId && id < kButtonId + 3 && HIWORD(wparam) == BN_CLICKED) {
        Invoke(static_cast<int>(id - kButtonId));
        return 0;
      }
      return std::nullopt;
    }
    case WM_DRAWITEM: {
      auto item = reinterpret_cast<DRAWITEMSTRUCT*>(lparam);
      if (item->CtlID >= kButtonId && item->CtlID < kButtonId + 3) {
        PaintButton(*item);
        return TRUE;
      }
      return std::nullopt;
    }
    case WM_PAINT: {
      PAINTSTRUCT paint{};
      HDC dc = BeginPaint(window_, &paint);
      Paint(dc);
      EndPaint(window_, &paint);
      return 0;
    }
    case WM_ERASEBKGND:
      // Flutter and the caption paint their own regions without a white flash.
      return 1;
    case WM_ACTIVATE:
      if (LOWORD(wparam) == WA_INACTIVE) {
        SetHovered(-1);
        ResetPressed();
      }
      Layout();
      return std::nullopt;
    case WM_SIZE:
    case WM_DPICHANGED:
      Layout();
      return std::nullopt;
  }
  return std::nullopt;
}

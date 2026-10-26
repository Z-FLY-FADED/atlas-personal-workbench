#include "../atlas_title_bar.h"

#include <windowsx.h>

#include <iostream>
#include <string>

namespace {
struct Fixture {
  AtlasTitleBar bar;
  UINT command = 0;
};

LRESULT CALLBACK TestWindowProc(HWND hwnd, UINT message, WPARAM wparam,
                                LPARAM lparam) {
  if (message == WM_NCCREATE) {
    auto create = reinterpret_cast<CREATESTRUCT*>(lparam);
    SetWindowLongPtr(hwnd, GWLP_USERDATA,
                     reinterpret_cast<LONG_PTR>(create->lpCreateParams));
  }
  auto fixture = reinterpret_cast<Fixture*>(GetWindowLongPtr(hwnd, GWLP_USERDATA));
  if (fixture) {
    // Record commands instead of closing, showing or moving any application.
    if (message == WM_SYSCOMMAND) {
      fixture->command = static_cast<UINT>(wparam) & 0xFFF0;
      return 0;
    }
    if (auto result = fixture->bar.HandleMessage(message, wparam, lparam)) {
      return *result;
    }
  }
  return DefWindowProc(hwnd, message, wparam, lparam);
}

void DrainCommands(HWND window, Fixture& fixture) {
  fixture.command = 0;
  MSG message{};
  while (PeekMessage(&message, window, WM_SYSCOMMAND, WM_SYSCOMMAND, PM_REMOVE)) {
    DispatchMessage(&message);
  }
}

POINT Center(HWND button, HWND relative_to) {
  RECT rect{};
  GetWindowRect(button, &rect);
  POINT point{(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2};
  if (relative_to) ScreenToClient(relative_to, &point);
  return point;
}

int checks = 0;
bool Check(bool condition, const char* label) {
  ++checks;
  std::cout << (condition ? "PASS " : "FAIL ") << label << '\n';
  return condition;
}
}  // namespace

int main() {
  SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
  WNDCLASSW type{};
  type.lpfnWndProc = TestWindowProc;
  type.hInstance = GetModuleHandle(nullptr);
  type.lpszClassName = L"ATLAS_CAPTION_TEST";
  if (!RegisterClassW(&type)) return 1;
  Fixture fixture;
  HWND window = CreateWindowW(type.lpszClassName, L"ATLAS hidden caption test",
      WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN, 10, 10, 900, 600,
      nullptr, nullptr, type.hInstance, &fixture);
  bool ok = Check(window && fixture.bar.Create(window), "create hidden native controls");
  if (!ok) return 1;

  const wchar_t* labels[] = {
      L"\u6700\u5c0f\u5316", L"\u6700\u5927\u5316", L"\u5173\u95ed"};
  const LRESULT hit_tests[] = {HTMINBUTTON, HTMAXBUTTON, HTCLOSE};
  const UINT commands[] = {SC_MINIMIZE, SC_MAXIMIZE, SC_CLOSE};
  HWND buttons[3]{};
  for (int i = 0; i < 3; ++i) {
    buttons[i] = FindWindowExW(window, nullptr, L"BUTTON", labels[i]);
    ok &= Check(buttons[i] != nullptr, "named accessible caption button");
    const POINT screen = Center(buttons[i], nullptr);
    ok &= Check(SendMessage(window, WM_NCHITTEST, 0,
        MAKELPARAM(screen.x, screen.y)) == hit_tests[i], "native caption hit test");
    // Automation invokes the real BUTTON's default action.
    SendMessage(buttons[i], BM_CLICK, 0, 0);
    DrainCommands(window, fixture);
    ok &= Check(fixture.command == commands[i], "accessible button command");
    // Pointer input goes through non-client down and captured client up.
    const POINT client = Center(buttons[i], window);
    SendMessage(window, WM_NCLBUTTONDOWN, hit_tests[i], MAKELPARAM(screen.x, screen.y));
    SendMessage(window, WM_LBUTTONUP, 0, MAKELPARAM(client.x, client.y));
    DrainCommands(window, fixture);
    ok &= Check(fixture.command == commands[i], "pointer button command");
  }

  const POINT screen = Center(buttons[2], nullptr);
  SendMessage(window, WM_NCLBUTTONDOWN, HTCLOSE, MAKELPARAM(screen.x, screen.y));
  SendMessage(window, WM_LBUTTONUP, 0, MAKELPARAM(300, 100));
  DrainCommands(window, fixture);
  ok &= Check(fixture.command == 0, "release outside close cancels action");
  SendMessage(window, WM_NCLBUTTONDOWN, HTCLOSE, MAKELPARAM(screen.x, screen.y));
  SendMessage(window, WM_CANCELMODE, 0, 0);
  const POINT client = Center(buttons[2], window);
  SendMessage(window, WM_LBUTTONUP, 0, MAKELPARAM(client.x, client.y));
  DrainCommands(window, fixture);
  ok &= Check(fixture.command == 0, "cancelled capture cannot close window");

  const LONG_PTR style = GetWindowLongPtr(window, GWL_STYLE);
  // Set only the maximized state flag, keeping this fixture entirely hidden.
  SetWindowLongPtr(window, GWL_STYLE, style | WS_MAXIMIZE);
  fixture.bar.Layout();
  wchar_t label[32]{};
  GetWindowTextW(buttons[1], label, 32);
  ok &= Check(std::wstring(label) == L"\u8fd8\u539f", "maximize changes action name to restore");
  SendMessage(buttons[1], BM_CLICK, 0, 0);
  DrainCommands(window, fixture);
  ok &= Check(fixture.command == SC_RESTORE, "maximized button issues restore");
  SetWindowLongPtr(window, GWL_STYLE, style);
  fixture.bar.Layout();

  const UINT dpi = GetDpiForWindow(window);
  POINT caption{MulDiv(250, dpi, 96), MulDiv(22, dpi, 96)};
  ClientToScreen(window, &caption);
  ok &= Check(SendMessage(window, WM_NCHITTEST, 0,
      MAKELPARAM(caption.x, caption.y)) == HTCAPTION, "blank caption keeps native dragging");
  POINT top{MulDiv(250, dpi, 96), 1};
  ClientToScreen(window, &top);
  ok &= Check(SendMessage(window, WM_NCHITTEST, 0,
      MAKELPARAM(top.x, top.y)) == HTTOP, "top border remains resizable");
  SetWindowPos(window, nullptr, 0, 0, 540, 600,
               SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
  RECT bounds{};
  GetClientRect(window, &bounds);
  const POINT close_center = Center(buttons[2], window);
  ok &= Check(close_center.x < bounds.right && close_center.x > bounds.right / 2,
               "controls stay at right edge after resize");
  ok &= Check(!IsWindowVisible(window), "test never shows or activates a window");
  DestroyWindow(window);
  UnregisterClassW(type.lpszClassName, type.hInstance);
  std::cout << checks << " native caption checks; " << (ok ? "all passed" : "FAILED") << '\n';
  return ok ? 0 : 1;
}

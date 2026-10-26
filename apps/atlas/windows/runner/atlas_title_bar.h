#ifndef RUNNER_ATLAS_TITLE_BAR_H_
#define RUNNER_ATLAS_TITLE_BAR_H_

#include <windows.h>

#include <optional>

// Native caption controls stay accessible to Windows while their appearance
// follows the application's warm palette. Flutter starts below this strip.
class AtlasTitleBar {
 public:
  bool Create(HWND window);
  void Layout();
  int Height() const;
  std::optional<LRESULT> HandleMessage(UINT message, WPARAM wparam,
                                     LPARAM lparam);

 private:
  static LRESULT CALLBACK ButtonProc(HWND button, UINT message, WPARAM wparam,
                                     LPARAM lparam, UINT_PTR subclass_id,
                                     DWORD_PTR data);
  int Scale(int logical) const;
  RECT ButtonRect(int index) const;
  int ButtonAt(POINT client_point) const;
  void SetHovered(int index);
  void ResetPressed();
  void Invoke(int index);
  void Paint(HDC dc);
  void PaintButton(const DRAWITEMSTRUCT& item);

  HWND window_ = nullptr;
  HWND buttons_[3] = {};
  HWND tooltip_ = nullptr;
  int hovered_ = -1;
  int pressed_ = -1;
};

#endif  // RUNNER_ATLAS_TITLE_BAR_H_

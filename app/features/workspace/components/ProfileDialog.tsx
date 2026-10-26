"use client";
import type { UserProfile } from "../../../contracts/workspace";
import { getAvatarInitial } from "../../../shared/lib/profile";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "profileModal" | "setProfileModal" | "profile" | "saveProfile">;
};
export function ProfileDialog({ controller }: Props) {
    const { profileModal, setProfileModal, profile, saveProfile } = controller;
    return <>{profileModal && (<div className="modal-backdrop" onMouseDown={() => setProfileModal(false)}>
          <form key={`${profile.displayName}-${profile.updatedAt || "profile"}`} className="modal profile-modal" onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>PERSONAL PROFILE</small>
                <h2>编辑个人资料</h2>
              </div>
              <button type="button" onClick={() => setProfileModal(false)}>
                ×
              </button>
            </div>
            <div className="profile-preview">
              <span className={`avatar ${profile.accent}`}>
                {getAvatarInitial(profile.displayName)}
              </span>
              <div>
                <b>{profile.displayName}</b>
                <small>{profile.motto || "添加一句个人标签"}</small>
              </div>
            </div>
            <label>
              显示名称
              <input name="displayName" required autoFocus defaultValue={profile.displayName} maxLength={24} placeholder="你的姓名或昵称"/>
            </label>
            <label>
              个人标签
              <input name="motto" defaultValue={profile.motto} maxLength={60} placeholder="例如：专注 · 自洽 · 成长"/>
            </label>
            <fieldset className="profile-accent">
              <legend>
                头像颜色 <small>选择色块即可</small>
              </legend>
              {([
                "gold",
                "blue",
                "green",
                "rose",
                "violet",
                "slate",
            ] as UserProfile["accent"][]).map((accent) => (<label key={accent} title={`选择${accent}色头像`}>
                  <input type="radio" name="accent" value={accent} defaultChecked={profile.accent === accent} aria-label={`选择${accent}色头像`}/>
                  <span className={`avatar ${accent}`} aria-hidden="true"/>
                </label>))}
            </fieldset>
            <button className="submit" type="submit">
              保存个人资料 <span>→</span>
            </button>
          </form>
        </div>)}</>;
}

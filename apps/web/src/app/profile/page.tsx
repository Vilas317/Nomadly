import { Camera, Globe2, MapPin, Settings, UserRound } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="page-stack">
      <section className="page-intro"><span className="eyebrow">YOUR TRAVEL IDENTITY</span><h1>Your story, in places.</h1><p>A home for your travel interests, journeys and memories.</p></section>
      <div className="profile-card"><div className="profile-cover" /><div className="profile-main"><div className="profile-avatar"><UserRound size={34} /></div><div className="profile-actions"><button className="button button-outline"><Settings size={15} /> Settings</button></div><h2>Your Nomadly profile</h2><p className="muted">Complete your profile to help other travellers get to know you.</p><div className="profile-stats"><span><strong>0</strong> Trips</span><span><strong>0</strong> Places</span><span><strong>0</strong> Connections</span></div><div className="profile-interests"><span><Globe2 size={16} /> Travel interests will appear here</span><span><MapPin size={16} /> Add your home city</span><span><Camera size={16} /> Your travel journal will live here</span></div></div></div>
    </div>
  );
}

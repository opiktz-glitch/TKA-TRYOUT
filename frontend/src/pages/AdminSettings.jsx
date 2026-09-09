import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { IconUser, IconKey } from "../components/Icons";

import { updateMyAccountProfile } from "../services/api";
import { useAuth } from "../auth/AuthContext";


function AdminSettings() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  function handleCancel() {
    navigate(-1);
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }

    try {
      setSaving(true);

      const result = await updateMyAccountProfile(fullName.trim());

      await refreshUser();

      setSuccess(result.message || "Profil berhasil diperbarui");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      setError(err.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">

          {/* HEADER */}

          <div className="page-header">
            <div>
              <h1>Pengaturan</h1>
              <p>Kelola profil dan keamanan akun admin kamu</p>
            </div>
          </div>

          {/* KARTU AKUN (read-only) + tombol ubah password */}

          <div
            className="dashboard-card"
            style={{
              maxWidth: "700px",
              margin: "0 auto 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconUser size={24} />
              </div>

              <div style={{ flex: 1, minWidth: 140 }}>
                <strong style={{ fontSize: 16 }}>{user?.full_name}</strong>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  @{user?.username} &middot; {user?.role}
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/change-password")}
              >
                <IconKey size={15} />
                Ubah Password
              </button>
            </div>
          </div>

          {/* FORM EDIT PROFIL */}

          <div className="dashboard-card" style={{ maxWidth: "700px", margin: "0 auto" }}>

            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Edit Profil</h2>
            <p style={{ marginBottom: 20, color: "#6b7280", fontSize: 13 }}>
              Username dan role tidak bisa diubah di sini.
            </p>

            {error && (
              <div className="error-message" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            {success && (
              <div
                className="alert-success"
                style={{
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={user?.username || ""}
                  disabled
                />
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={handleCancel}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>

            </form>
          </div>

        </div>

      </main>
    </div>
  );
}

export default AdminSettings;

import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { IconEdit, IconTrash, IconCheck } from "../components/Icons";
import {
  getSubjects,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion as deleteQuestionApi,
} from "../services/api";

const OPTION_CODES = ["A", "B", "C", "D", "E"];

const DIFFICULTIES = [
  {
    value: "EASY",
    label: "Mudah",
  },
  {
    value: "MEDIUM",
    label: "Sedang",
  },
  {
    value: "HARD",
    label: "Sulit",
  },
];


function QuestionManagement() {

  // ======================================================
  // DATA
  // ======================================================

  const [questions, setQuestions] = useState([]);

  const [subjects, setSubjects] = useState([]);

  // ======================================================
  // UI STATE
  // ======================================================

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editingQuestion, setEditingQuestion] =
    useState(null);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  // ======================================================
  // FILTER
  // ======================================================

  const [search, setSearch] = useState("");

  const [subjectFilter, setSubjectFilter] =
    useState("");

  const [difficultyFilter, setDifficultyFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  // ======================================================
  // MESSAGE
  // ======================================================

  const [loadError, setLoadError] = useState("");

  const [actionError, setActionError] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");

  const [formError, setFormError] = useState("");

  const [formSuccess, setFormSuccess] = useState("");

  // ======================================================
  // FORM
  // ======================================================

  const createEmptyForm = () => ({
    subject_id: "",
    question_text: "",
    question_type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation: "",
    points: 1,
    is_active: true,

    options: OPTION_CODES.map((code) => ({
      option_code: code,
      option_text: "",
      is_correct: false,
    })),
  });


  const [form, setForm] = useState(
    createEmptyForm()
  );


  // ======================================================
  // LOAD SUBJECTS
  // ======================================================

  async function loadSubjects() {

    try {

      const data = await getSubjects();

      setSubjects(data);

    } catch (err) {

      console.error(
        "LOAD SUBJECT ERROR:",
        err
      );

      setLoadError(
        err.message ||
        "Gagal mengambil mata pelajaran"
      );
    }
  }


  // ======================================================
  // LOAD QUESTIONS
  // ======================================================

  async function loadQuestions() {

    try {

      setLoading(true);
      setLoadError("");

      const data = await getQuestions();

      setQuestions(data);

    } catch (err) {

      console.error(
        "LOAD QUESTIONS ERROR:",
        err
      );

      setLoadError(
        err.message ||
        "Gagal mengambil bank soal"
      );

    } finally {

      setLoading(false);
    }
  }


  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {

    loadSubjects();

    loadQuestions();

  }, []);


  // ======================================================
  // SUBJECT NAME
  // ======================================================

  function getSubjectName(subjectId) {

    const subject =
      subjects.find(
        item => item.id === subjectId
      );

    return subject
      ? subject.name
      : "-";
  }


  // ======================================================
  // DIFFICULTY LABEL
  // ======================================================

  function getDifficultyLabel(
    difficulty
  ) {

    const item =
      DIFFICULTIES.find(
        item =>
          item.value === difficulty
      );

    return item
      ? item.label
      : difficulty;
  }


  // ======================================================
  // OPEN ADD MODAL
  // ======================================================

  function openAddModal() {

    setEditingQuestion(null);

    setForm(createEmptyForm());

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================

  function openEditModal(question) {

    const options =
      OPTION_CODES.map(code => {

        const existingOption =
          question.options?.find(
            option =>
              option.option_code === code
          );

        return {
          option_code: code,

          option_text:
            existingOption?.option_text ||
            "",

          is_correct:
            existingOption?.is_correct ||
            false,
        };
      });


    setEditingQuestion(question);

    setForm({
      subject_id:
        String(question.subject_id),

      question_text:
        question.question_text || "",

      question_type:
        question.question_type ||
        "MULTIPLE_CHOICE",

      difficulty:
        question.difficulty ||
        "MEDIUM",

      explanation:
        question.explanation || "",

      points:
        question.points ?? 1,

      is_active:
        question.is_active !== false,

      options,
    });

    setFormError("");
    setFormSuccess("");

    setShowModal(true);
  }


  // ======================================================
  // CLOSE MODAL
  // ======================================================

  function closeModal() {

    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingQuestion(null);

    setForm(createEmptyForm());

    setFormError("");
    setFormSuccess("");
  }


  // ======================================================
  // FORM CHANGE
  // ======================================================

  function handleChange(event) {

    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(prev => ({
      ...prev,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }


  // ======================================================
  // OPTION CHANGE
  // ======================================================

  function handleOptionTextChange(
    index,
    value
  ) {

    setForm(prev => {

      const newOptions =
        [...prev.options];

      newOptions[index] = {
        ...newOptions[index],
        option_text: value,
      };

      return {
        ...prev,
        options: newOptions,
      };
    });
  }


  // ======================================================
  // CORRECT ANSWER
  // ======================================================

  function handleCorrectAnswer(index) {

    setForm(prev => {

      const newOptions =
        prev.options.map(
          (option, optionIndex) => ({
            ...option,

            is_correct:
              optionIndex === index,
          })
        );

      return {
        ...prev,
        options: newOptions,
      };
    });
  }


  // ======================================================
  // VALIDATE FORM
  // ======================================================

  function validateForm() {

    if (!form.subject_id) {

      return "Mata pelajaran wajib dipilih";
    }

    if (!form.question_text.trim()) {

      return "Pertanyaan wajib diisi";
    }

    if (form.question_text.trim().length < 5) {

      return "Pertanyaan minimal 5 karakter";
    }

    const points =
      Number(form.points);

    if (
      !Number.isFinite(points) ||
      points <= 0
    ) {

      return "Bobot soal harus lebih besar dari 0";
    }

    for (
      let index = 0;
      index < form.options.length;
      index++
    ) {

      const option =
        form.options[index];

      if (!option.option_text.trim()) {

        return (
          `Pilihan ${option.option_code} ` +
          "wajib diisi"
        );
      }
    }

    const correctOptions =
      form.options.filter(
        option => option.is_correct
      );

    if (correctOptions.length !== 1) {

      return (
        "Harus memilih tepat satu " +
        "jawaban yang benar"
      );
    }

    return null;
  }


  // ======================================================
  // SUBMIT
  // ======================================================

  async function handleSubmit(event) {

    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    const validationError =
      validateForm();

    if (validationError) {

      setFormError(validationError);

      return;
    }

    try {

      setSaving(true);

      const payload = {

        subject_id:
          Number(form.subject_id),

        question_text:
          form.question_text.trim(),

        question_type:
          form.question_type,

        difficulty:
          form.difficulty,

        explanation:
          form.explanation.trim() ||
          null,

        points:
          Number(form.points),

        is_active:
          form.is_active,

        options:
          form.options.map(option => ({
            option_code:
              option.option_code,

            option_text:
              option.option_text.trim(),

            is_correct:
              option.is_correct,
          })),
      };


      const data = editingQuestion
        ? await updateQuestion(editingQuestion.id, payload)
        : await createQuestion(payload);


      setFormSuccess(
        data.message ||
        (editingQuestion
          ? "Soal berhasil diperbarui"
          : "Soal berhasil ditambahkan")
      );

      await loadQuestions();

      /*
       * Tunggu sebentar supaya admin sempat melihat
       * pesan berhasil sebelum modal tertutup.
       */
      setTimeout(() => {
        setShowModal(false);
        setEditingQuestion(null);
        setForm(createEmptyForm());
        setFormSuccess("");
      }, 900);


    } catch (err) {

      console.error(
        "SAVE QUESTION ERROR:",
        err
      );

      setFormError(
        err.message ||
        "Gagal menyimpan soal"
      );

    } finally {

      setSaving(false);
    }
  }


  // ======================================================
  // DELETE
  // ======================================================

  async function handleDelete(
    question
  ) {

    const confirmed =
      window.confirm(
        "Apakah Anda yakin ingin menghapus soal ini?"
      );

    if (!confirmed) {
      return;
    }


    try {

      setDeletingId(question.id);

      setActionError("");
      setActionSuccess("");

      const data = await deleteQuestionApi(question.id);


      setActionSuccess(
        data.message ||
        "Soal berhasil dihapus"
      );


      await loadQuestions();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);


    } catch (err) {

      console.error(
        "DELETE QUESTION ERROR:",
        err
      );

      setActionError(
        err.message ||
        "Gagal menghapus soal"
      );

    } finally {

      setDeletingId(null);
    }
  }


  // ======================================================
  // FILTER QUESTIONS
  // ======================================================

  const filteredQuestions =
    useMemo(() => {

      const keyword =
        search.trim().toLowerCase();


      return questions.filter(
        question => {

          const subjectName =
            getSubjectName(
              question.subject_id
            ).toLowerCase();


          const questionText =
            (
              question.question_text ||
              ""
            ).toLowerCase();


          const matchesSearch =
            !keyword ||
            questionText.includes(keyword) ||
            subjectName.includes(keyword);


          const matchesSubject =
            !subjectFilter ||
            String(
              question.subject_id
            ) === String(
              subjectFilter
            );


          const matchesDifficulty =
            !difficultyFilter ||
            question.difficulty ===
              difficultyFilter;


          const matchesStatus =
            !statusFilter ||
            (
              statusFilter === "ACTIVE"
                ? question.is_active
                : !question.is_active
            );


          return (
            matchesSearch &&
            matchesSubject &&
            matchesDifficulty &&
            matchesStatus
          );
        }
      );

    }, [
      questions,
      subjects,
      search,
      subjectFilter,
      difficultyFilter,
      statusFilter,
    ]);


  // ======================================================
  // RENDER
  // ======================================================

  return (

    <div className="app-layout">

      <Sidebar />


      <main className="main-content">

        <Header />


        <div className="content">

          {/* ============================================
              PAGE HEADER
              ============================================ */}

          <div className="page-header">

            <div>

              <h1>
                Bank Soal
              </h1>

              <p>
                Kelola soal TKA Tryout
              </p>

            </div>


            <button
              className="primary-button"
              onClick={openAddModal}
            >
              + Tambah Soal
            </button>

          </div>


          {/* ============================================
              FILTER & TABLE CARD
              ============================================ */}

          <div className="dashboard-card">

            <div className="question-filter">

              <div className="filter-group">

                <input
                  type="text"
                  placeholder="Cari pertanyaan..."
                  className="search-input"
                  value={search}
                  onChange={e =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="filter-group">

                <select
                  value={subjectFilter}
                  onChange={e =>
                    setSubjectFilter(
                      e.target.value
                    )
                  }
                  className="search-input"
                >

                  <option value="">
                    Semua Mata Pelajaran
                  </option>

                  {subjects.map(
                    subject => (

                      <option
                        key={
                          subject.id
                        }
                        value={
                          subject.id
                        }
                      >
                        {subject.code} -{" "}
                        {subject.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="filter-group">

                <select
                  value={
                    difficultyFilter
                  }
                  onChange={e =>
                    setDifficultyFilter(
                      e.target.value
                    )
                  }
                  className="search-input"
                >

                  <option value="">
                    Semua Tingkat Kesulitan
                  </option>

                  {DIFFICULTIES.map(
                    difficulty => (

                      <option
                        key={
                          difficulty.value
                        }
                        value={
                          difficulty.value
                        }
                      >
                        {
                          difficulty.label
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="filter-group">

                <select
                  value={statusFilter}
                  onChange={e =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="search-input"
                >

                  <option value="">
                    Semua Status
                  </option>

                  <option value="ACTIVE">
                    Aktif
                  </option>

                  <option value="INACTIVE">
                    Tidak Aktif
                  </option>

                </select>

              </div>

            </div>


            {loading && (

              <div className="loading-message">
                Memuat bank soal...
              </div>

            )}


            {loadError && !showModal && (

              <div className="error-message">
                {loadError}
              </div>

            )}


            {actionError && (

              <div className="form-error-message" style={{ marginBottom: "15px" }}>
                {actionError}
              </div>

            )}


            {actionSuccess && (

              <div className="success-message" style={{ marginBottom: "15px" }}>
                <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                {actionSuccess}
              </div>

            )}


            {!loading && (

              <div className="table-container">

                <table className="user-table">

                  <thead>

                    <tr>

                      <th className="align-center">ID</th>
                      <th className="align-center">Mata Pelajaran</th>
                      <th className="align-center">Pertanyaan</th>
                      <th className="align-center">Tingkat</th>
                      <th className="align-center">Bobot</th>
                      <th className="align-center">Status</th>
                      <th className="align-center">Aksi</th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredQuestions.map(
                      question => (

                        <tr
                          key={
                            question.id
                          }
                        >

                          <td className="align-center">
                            {question.id}
                          </td>


                          <td className="align-left">

                            <strong>
                              {
                                getSubjectName(
                                  question.subject_id
                                )
                              }
                            </strong>

                          </td>


                          <td className="align-justify">

                            <div className="question-preview">
                              {
                                question.question_text
                              }
                            </div>

                          </td>


                          <td className="align-center">

                            <span
                              className={
                                `difficulty-badge ` +
                                question.difficulty
                                  .toLowerCase()
                              }
                            >
                              {
                                getDifficultyLabel(
                                  question.difficulty
                                )
                              }
                            </span>

                          </td>


                          <td className="align-center">
                            {question.points}
                          </td>


                          <td className="align-center">

                            {question.is_active ? (

                              <span className="status-active">
                                Aktif
                              </span>

                            ) : (

                              <span className="status-inactive">
                                Nonaktif
                              </span>

                            )}

                          </td>


                          <td className="align-center">

                            <div className="action-buttons">

                              <button
                                className="edit-button"
                                onClick={() =>
                                  openEditModal(
                                    question
                                  )
                                }
                              >
                                <IconEdit size={16} />
                              </button>


                              <button
                                className="delete-button"
                                onClick={() =>
                                  handleDelete(
                                    question
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  question.id
                                }
                              >
                                <IconTrash size={16} />
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>


                {filteredQuestions.length === 0 && (

                  <div className="empty-message">
                    {search || subjectFilter || difficultyFilter || statusFilter
                      ? "Soal tidak ditemukan."
                      : "Belum ada soal."
                    }
                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      </main>


      {/* ==================================================
          MODAL TAMBAH / EDIT SOAL
          ================================================== */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal question-modal">

            <div className="modal-header">

              <div>

                <h2>
                  {editingQuestion
                    ? "Edit Soal"
                    : "Tambah Soal"
                  }
                </h2>

                <p>
                  {editingQuestion
                    ? "Perbaharui data soal pilihan ganda"
                    : "Tambahkan soal pilihan ganda baru"
                  }
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
            >

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Mata Pelajaran *
                  </label>

                  <select
                    name="subject_id"
                    value={
                      form.subject_id
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  >

                    <option value="">
                      -- Pilih Mata Pelajaran --
                    </option>

                    {subjects
                      .filter(
                        subject =>
                          subject.is_active
                      )
                      .map(subject => (

                        <option
                          key={
                            subject.id
                          }
                          value={
                            subject.id
                          }
                        >
                          {subject.code} -{" "}
                          {subject.name}
                        </option>

                      ))}

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Tingkat Kesulitan *
                  </label>

                  <select
                    name="difficulty"
                    value={
                      form.difficulty
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                    required
                  >

                    {DIFFICULTIES.map(
                      difficulty => (

                        <option
                          key={
                            difficulty.value
                          }
                          value={
                            difficulty.value
                          }
                        >
                          {
                            difficulty.label
                          }
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>


              <div className="form-group">

                <label>
                  Pertanyaan *
                </label>

                <textarea
                  name="question_text"
                  value={
                    form.question_text
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Tuliskan pertanyaan..."
                  rows="4"
                  disabled={saving}
                  required
                />

              </div>


              <div className="options-section">

                <div className="section-title">

                  <strong>
                    Pilihan Jawaban
                  </strong>

                  <span>
                    Pilih satu jawaban benar
                  </span>

                </div>


                {form.options.map(
                  (option, index) => (

                    <div
                      className={
                        `option-input-row ` +
                        (
                          option.is_correct
                            ? "correct"
                            : ""
                        )
                      }
                      key={
                        option.option_code
                      }
                    >

                      <label
                        className="correct-radio"
                      >

                        <input
                          type="radio"
                          name="correct_answer"
                          checked={
                            option.is_correct
                          }
                          onChange={() =>
                            handleCorrectAnswer(
                              index
                            )
                          }
                          disabled={saving}
                        />

                        <span>
                          {option.option_code}
                        </span>

                      </label>


                      <input
                        type="text"
                        value={
                          option.option_text
                        }
                        onChange={e =>
                          handleOptionTextChange(
                            index,
                            e.target.value
                          )
                        }
                        placeholder={
                          `Pilihan ${option.option_code}`
                        }
                        disabled={saving}
                        required
                      />


                      {option.is_correct && (

                        <span className="correct-label">
                          Jawaban Benar
                        </span>

                      )}

                    </div>

                  )
                )}

              </div>


              <div className="form-group">

                <label>
                  Pembahasan
                </label>

                <textarea
                  name="explanation"
                  value={
                    form.explanation
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Tuliskan pembahasan atau penjelasan jawaban..."
                  rows="3"
                  disabled={saving}
                />

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Bobot Soal *
                  </label>

                  <input
                    type="number"
                    name="points"
                    value={
                      form.points
                    }
                    onChange={
                      handleChange
                    }
                    min="0.1"
                    step="0.1"
                    disabled={saving}
                    required
                  />

                </div>


                <div className="form-checkbox" style={{ alignSelf: "flex-end", paddingBottom: "8px" }}>

                  <input
                    type="checkbox"
                    name="is_active"
                    checked={
                      form.is_active
                    }
                    onChange={
                      handleChange
                    }
                    id="is_active"
                    disabled={saving}
                  />

                  <label htmlFor="is_active">
                    Soal aktif
                  </label>

                </div>

              </div>


              {formError && (

                <div
                  className="form-error-message"
                  style={{ marginBottom: "15px" }}
                >
                  {formError}
                </div>

              )}


              {formSuccess && (

                <div
                  className="success-message"
                  style={{ marginBottom: "15px" }}
                >
                  <IconCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                  {formSuccess}
                </div>

              )}


              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                >
                  Batal
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >

                  {saving
                    ? "Menyimpan..."
                    : "Simpan Soal"
                  }

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}


export default QuestionManagement;
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Athlete = {
    id: string
    first_name: string
    last_name: string
    email: string
    current_week: number
    last_checkin: string | null
    assigned_date: string
    program: {
        name: string
        duration: number
    } | null
}

const calculateExpectedWeek = (assignedDate: string, duration: number) => {
    const start = new Date(assignedDate)
    const now = new Date()
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
    return Math.min(diffWeeks, duration)
}


export default function AdminPage() {
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
    const [programs, setPrograms] = useState<{ id: string; name: string; duration: number }[]>([])
    const [assignMode, setAssignMode] = useState(false)
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
    const [assignDate, setAssignDate] = useState<string>(new Date().toISOString().split('T')[0])

    const isLastWeek = (athlete: Athlete) => {
        const assigned = new Date(athlete.assigned_date)
        const today = new Date()
        const diffWeeks = Math.floor((today.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
        return diffWeeks >= (athlete.program?.duration ?? 0)
    }

    useEffect(() => {
        const fetchAthletes = async () => {
            const { data, error } = await supabase
                .from('athletes')
                .select(`
        id, first_name, last_name, email, current_week, last_checkin, assigned_date,
        program:program_id (name, duration)
      `)
                .order('last_name')

            if (!error && data) setAthletes(data)
        }

        const fetchPrograms = async () => {
            const { data, error } = await supabase.from('programs').select('*').order('name')
            if (!error && data) setPrograms(data)
        }

        fetchAthletes()
        fetchPrograms()
    }, [])


    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            <table className="w-full table-auto border text-sm">
                <thead className="bg-red-600">
                <tr>
                    <th className="border px-2 py-2 text-left">
                        <input
                            type="checkbox"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedAthletes(new Set(athletes.map((a) => a.id)))
                                } else {
                                    setSelectedAthletes(new Set())
                                }
                            }}
                        />
                    </th>

                    <th className="border px-2 py-2 text-left">First Name</th>
                    <th className="border px-2 py-2 text-left">Last Name</th>
                    <th className="border px-2 py-2 text-left">Email</th>
                    <th className="border px-2 py-2 text-left">Program</th>
                    <th className="border px-2 py-2 text-left">Duration</th>
                    <th className="border px-2 py-2 text-left">Assigned Date</th>
                    <th className="border px-2 py-2 text-left">Expected Week</th>
                    <th className="border px-2 py-2 text-left">Actual Week</th>


                </tr>
                </thead>
                <tbody>
                {athletes.map((athlete) => (
                    <tr key={athlete.id} className={isLastWeek(athlete) ? 'bg-yellow-100' : ''}>
                        <td className="border px-2 py-1 text-center">
                            <input
                                type="checkbox"
                                checked={selectedAthletes.has(athlete.id)}
                                onChange={() => {
                                    setSelectedAthletes((prev) => {
                                        const copy = new Set(prev)
                                        if (copy.has(athlete.id)) copy.delete(athlete.id)
                                        else copy.add(athlete.id)
                                        return copy
                                    })
                                }}
                            />
                        </td>
                        <td className="border px-2 py-1">{athlete.first_name}</td>
                        <td className="border px-2 py-1">{athlete.last_name}</td>
                        <td className="border px-2 py-1">{athlete.email}</td>
                        <td className="border px-2 py-1">{athlete.program?.name}</td>
                        <td className="border px-2 py-1">{athlete.program?.duration}</td>
                        <td className="border px-2 py-1">{athlete.assigned_date}</td>
                        <td className="border px-2 py-1">
                            {athlete.program
                                ? calculateExpectedWeek(athlete.assigned_date, athlete.program.duration)
                                : '-'}
                        </td>
                        <td className="border px-2 py-1">{athlete.current_week}</td>
                    </tr>

                ))}
                </tbody>
            </table>

            {selectedAthletes.size > 0 && !assignMode && (
                <button
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setAssignMode(true)}
                >
                    Assign Programming to {selectedAthletes.size} Athlete(s)
                </button>
            )}

            {assignMode && (
                <div className="mt-6 border-t pt-4">
                    <h2 className="text-xl font-semibold mb-2">Assign Programming</h2>

                    <label className="block mb-1">Select Program:</label>
                    <select
                        className="w-full p-2 border rounded mb-4"
                        value={selectedProgramId || ''}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                    >
                        <option value="">-- Choose a program --</option>
                        {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                                {program.name} ({program.duration} weeks)
                            </option>
                        ))}
                    </select>

                    <label className="block mb-1">Start Date:</label>
                    <input
                        type="date"
                        className="w-full p-2 border rounded mb-4"
                        value={assignDate}
                        onChange={(e) => setAssignDate(e.target.value)}
                    />

                    <div className="flex gap-4">
                        <button
                            className="px-4 py-2 bg-green-600 text-white rounded"
                            onClick={async () => {
                                if (!selectedProgramId) return alert('Please select a program')

                                const updates = Array.from(selectedAthletes).map((athleteId) =>
                                    supabase.from('athletes').update({
                                        program_id: selectedProgramId,
                                        assigned_date: assignDate,
                                        current_week: 1,
                                    }).eq('id', athleteId)
                                )

                                await Promise.all(updates)
                                alert('Programming assigned!')
                                setAssignMode(false)
                                setSelectedAthletes(new Set())
                                window.location.reload() // simple way to reload data
                            }}
                        >
                            Assign
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-500 text-white rounded"
                            onClick={() => setAssignMode(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}

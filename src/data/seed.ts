import type { Clinic, Listing } from '../types'

// 7 live listings + 2 pending — copied from the prototype's DATA array.
export const SEED_LISTINGS: Listing[] = [
  {
    id: 'mishka', species: 'cat', name: 'Mishka', age: '8 months', sex: 'Female',
    area: 'Maafannu, Malé', tags: ['Vaccinated', 'Hand-tame', 'Needs foster'],
    org: 'Maldives Cat Rescue', verified: true, tint: '#FBE3EC',
    photo: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop',
    story:
      "Found near the fish market as a tiny kitten, Mishka is now a curious, people-loving girl. She's litter-trained and gets along with other cats, and she's looking for a foster while she waits for her forever home.",
  },
  {
    id: 'coco', species: 'cat', name: 'Coco', age: '2 years', sex: 'Male',
    area: 'Hulhumalé', tags: ['Vaccinated', 'Neutered'],
    org: null, lister: 'Aishath', verified: false, tint: '#E7F0FA',
    photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80&auto=format&fit=crop',
    story:
      "Coco is a calm, lap-loving boy whose family is relocating and can no longer keep him. He's fully vaccinated and neutered, and would do best as the only cat in a quiet home.",
  },
  {
    id: 'biscuit', species: 'cat', name: 'Biscuit', age: '4 months', sex: 'Male',
    area: 'Villingili', tags: ['Kitten', 'Needs foster', 'Hand-tame'],
    org: 'Feline Welfare Organization', verified: true, tint: '#FDF0DB',
    photo: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&q=80&auto=format&fit=crop',
    story:
      'A playful ginger kitten rescued from a construction site. Biscuit is hand-raised, endlessly affectionate, and ready for fostering or adoption by a patient family.',
  },
  {
    id: 'luna', species: 'cat', name: 'Luna', age: '1 year', sex: 'Female',
    area: 'Galolhu, Malé', tags: ['Vaccinated', 'Litter-trained'],
    org: null, lister: 'Ahmed', verified: false, tint: '#EFEAF7',
    photo: 'https://images.unsplash.com/photo-1517451330947-7809dead78d5?w=800&q=80&auto=format&fit=crop',
    story:
      "Gentle and quiet, Luna loves sunny windowsills and slow head scratches. She's vaccinated and litter-trained, and would suit a calm household.",
  },
  {
    id: 'kiwi', species: 'bird', name: 'Kiwi', age: '1 year', sex: 'Male',
    area: 'Maafannu, Malé', breed: 'Budgerigar', tags: ['Hand-tame', 'Bonded pair'],
    org: null, lister: 'Hassan', verified: false, tint: '#E3F3EC',
    photo: 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=800&q=80&auto=format&fit=crop',
    story:
      'Kiwi is a cheeky, hand-tame budgie who comes as a bonded pair with his best friend. He whistles little tunes and goes wild for millet.',
  },
  {
    id: 'mango', species: 'bird', name: 'Mango', age: '2 years', sex: 'Female',
    area: 'Hulhumalé', breed: 'Cockatiel', tags: ['Hand-tame'],
    org: 'Zoophilist Society Maldives', verified: true, tint: '#FDF0DB',
    photo: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=800&q=80&auto=format&fit=crop',
    story:
      'A sweet hand-tame cockatiel rehomed through Zoophilist Society. Mango steps up readily, enjoys gentle head scratches, and greets you every morning.',
  },
  {
    id: 'sky', species: 'bird', name: 'Sky', age: '6 months', sex: 'Unknown',
    area: 'Machangolhi, Malé', breed: 'Lovebird', tags: ['Needs foster'],
    org: null, lister: 'Fathmath', verified: false, tint: '#E7F0FA',
    photo: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&q=80&auto=format&fit=crop',
    story:
      'A bright, energetic young lovebird who needs a foster home with some bird experience while a permanent family is found.',
  },
  {
    id: 'pending-simba', species: 'cat', name: 'Simba', age: '5 months', sex: 'Male',
    area: 'Henveiru, Malé', tags: ['Kitten', 'Hand-tame'],
    org: null, lister: 'Ibrahim', verified: false, tint: '#FDF0DB', status: 'pending',
    photo: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop',
    story:
      'Rescued kitten from my street, very playful and already litter-trained. Hoping to find him a loving home.',
  },
  {
    id: 'pending-pixel', species: 'bird', name: 'Pixel', age: '1 year', sex: 'Male',
    area: 'Maafannu, Malé', breed: 'Budgerigar', tags: ['Hand-tame'],
    org: null, lister: 'Shaira', verified: false, tint: '#E3F3EC', status: 'pending',
    photo: 'https://images.unsplash.com/photo-1591198936750-16d8e15edb9e?w=800&q=80&auto=format&fit=crop',
    story:
      "Friendly hand-tame budgie, comes with his cage and food. Moving abroad and can't take him along.",
  },
]

export const SEED_CLINICS: Clinic[] = [
  {
    name: 'Oases Vet Hospital', area: 'Abadhah Fehi Magu, Malé',
    services: ['Surgery', 'Diagnostics', 'Grooming', 'Pet shop'], tint: '#8FC7E8',
    note: 'The first private standard-format veterinary clinic in the country, with a large attached pet shop.',
  },
  {
    name: 'Erika Vet Hospital', area: 'Malé',
    services: ['Medical care', 'Grooming'], tint: '#E78FB4',
    note: 'Medical care and grooming, with a particular focus on cats.',
  },
]

// Legally-importable pet birds only (PRD §7/§11).
export { BIRD_SPECIES } from '../server/contracts/api'

export const CAT_FILTERS = ['Vaccinated', 'Needs foster', 'Hand-tame', 'Kitten']
export const BIRD_FILTERS = ['Hand-tame', 'Needs foster', 'Bonded pair']
export const CAT_ADD_TAGS = ['Vaccinated', 'Neutered', 'Hand-tame', 'Litter-trained', 'Needs foster']
export const BIRD_ADD_TAGS = ['Hand-tame', 'Bonded pair', 'Needs foster']

const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const b2bMatch = content.match(/(\s+<NavLink\s+to="\/portal\/login\?portal=b2b"[\s\S]+?B2B Login\s+<\/NavLink>)/);
const distMatch = content.match(/(\s+<NavLink\s+to="\/portal\/login\?portal=distributor"[\s\S]+?Distributor Login\s+<\/NavLink>)/);

if (!b2bMatch || !distMatch) { console.log('Could not find login NavLink blocks'); process.exit(1); }

const b2bBlock = b2bMatch[0];
const distBlock = distMatch[0];

// Desktop Nav
const navFuncPos = content.indexOf('function Nav({ onOpenContactModal }) {');
const navFuncEnd = content.indexOf('\nfunction MobileNav', navFuncPos);
let navSection = content.slice(navFuncPos, navFuncEnd);
navSection = navSection.replace(/<nav className="hidden gap-2 md:flex items-center">\s+<NavLink[\s\S]+?B2B Login\s+<\/NavLink>\s+<NavLink[\s\S]+?Distributor Login\s+<\/NavLink>\s+\{navItems/, '<nav className="hidden gap-2 md:flex items-center">\n      {navItems');
navSection = navSection.replace(/(\s+\}\)\})\s+<\/nav>/, `$1${b2bBlock}${distBlock}\n    </nav>`);
content = content.slice(0, navFuncPos) + navSection + content.slice(navFuncEnd);
console.log('Desktop Nav updated');

// Mobile Nav
const mobileNavFuncPos = content.indexOf('function MobileNav({ onOpenContactModal }) {');
const mobileNavFuncEnd = content.indexOf('\nfunction ScrollToTopOnRouteChange', mobileNavFuncPos);
let mobileSection = content.slice(mobileNavFuncPos, mobileNavFuncEnd);
mobileSection = mobileSection.replace(/<nav className="flex-1 space-y-1 overflow-y-auto p-3">\s+<NavLink[\s\S]+?B2B Login\s+<\/NavLink>\s+<NavLink[\s\S]+?Distributor Login\s+<\/NavLink>\s+\{navItems/, '<nav className="flex-1 space-y-1 overflow-y-auto p-3">\n          {navItems');
const mobileB2B = '\n          <NavLink\n            to="/portal/login?portal=b2b"\n            onClick={() => setOpen(false)}\n            className={({ isActive }) =>\n              `block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.04em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${\n                isActive ? \'bg-fuchsia-600 !text-white\' : \'!text-white/75 hover:bg-white/10 hover:!text-white\'\n              }`\n            }\n          >\n            B2B Login\n          </NavLink>\n          <NavLink\n            to="/portal/login?portal=distributor"\n            onClick={() => setOpen(false)}\n            className={({ isActive }) =>\n              `block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.04em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 ${\n                isActive ? \'bg-fuchsia-600 !text-white\' : \'!text-white/75 hover:bg-white/10 hover:!text-white\'\n              }`\n            }\n          >\n            Distributor Login\n          </NavLink>';
mobileSection = mobileSection.replace(/(\s+\}\)\})\s+<\/nav>/, `$1${mobileB2B}\n        </nav>`);
content = content.slice(0, mobileNavFuncPos) + mobileSection + content.slice(mobileNavFuncEnd);
console.log('Mobile Nav updated');

fs.writeFileSync('src/App.jsx', content);
console.log('Done.');
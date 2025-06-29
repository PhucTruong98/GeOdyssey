import { Component, AfterViewInit } from '@angular/core';
import countryData from '../../assets/data/countries.json';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { PlatformService } from '../core/services/platform.service';


interface Country {
  code: string;
  name: string;
}
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: false
})
export class MapComponent implements AfterViewInit {
  selectedCountryCode: string | null = null;

  constructor(private platform: PlatformService) { }

  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;

    //build lookup map for countries
    const countryMap: Record<string, string> = {};
    (countryData as Country[]).forEach(c => {
      countryMap[c.code.toUpperCase()] = c.name;
    });


    const svgMap = document.getElementById('svgMap') as HTMLObjectElement;

    if (svgMap) {
      svgMap.addEventListener('load', () => {
        const svgDoc = svgMap.contentDocument!;
        const countries = svgDoc?.querySelectorAll('path[id]');
        const svgEl = svgDoc.documentElement;
        svgEl.setAttribute("id", "svgElement");

        //have to use this import statement instead of static import up there to avoid window is not define error
        import('svg-pan-zoom').then(({ default: svgPanZoom }) => {
          const instance = svgPanZoom(svgEl, {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: true,
            center: true,
            minZoom: 0.5,
            maxZoom: 20
          });
        });


        // 🔥 Inject hover style into <style> tag
        //note, we have to add styling here instead of html because SVG object are loaded as a separate doc, isolated from angular
        const style = svgDoc?.createElementNS('http://www.w3.org/2000/svg', 'style');
        style!.textContent = `
        path {
          transition: fill 0.3s ease, stroke 0.3s ease;
        }
        path:hover {
          fill: #1976d2;
          stroke: #fff;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
        }
      `;
        svgDoc?.documentElement.appendChild(style!);

        countries?.forEach((p: any) => {
          const code = p.id?.toUpperCase();
          const name = countryMap[code];

          if (name) {
            const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = name;
            p.appendChild(title);
          }

          p.style.cursor = 'pointer';
          p.addEventListener('click', () => {
            this.selectedCountryCode = code;
          });
        });



      });
    }
  }


  closeDetail() {
    this.selectedCountryCode = null;
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { CountryDetailComponent } from './country-detail/country-detail.component';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    MapComponent,
    CountryDetailComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    //ensure that map module is CSR, only initialized on /map route
    RouterModule.forChild([{ path: '', component: MapComponent }])

  ],
  exports: [MapComponent]
})
export class MapModule {}
